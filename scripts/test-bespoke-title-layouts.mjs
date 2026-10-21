#!/usr/bin/env node
// Actual editor geometry plus generated/canonical title layouts. Synthetic state only.
import { builderDestination, switchSurface } from './bespoke-test-navigation.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { browserType } from './bespoke-test-browser.mjs';
import catalog from '../bespoke/builder-catalog.json' with { type:'json' };
import { defaultDesign } from '../bespoke/builder-model.mjs';
import { createDevServer } from './bespoke-dev-server.mjs';
const root = path.resolve(import.meta.dirname, '..');
const layouts = ['center','left','bottom','split'], logos = ['corner','above'];
const evidence = [], output = process.env.BESPOKE_REVIEW_DIR;
if (output) await fs.mkdir(output, { recursive:true });
const legacy = JSON.parse(await fs.readFile(path.join(root, 'scripts/test-fixtures/bespoke/selection-money-management.json')));
const template = await fs.readFile(path.join(root, 'SPOKES Builder/template.html'), 'utf8');
const templateCss = [...template.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1]).join('\n');
const templateTitle = template.match(/<section class="slide slide-title active"[\s\S]*?<\/section>/)[0];
const initial = defaultDesign(catalog);
Object.assign(initial.roles, { titleBackground:'gold', titleBackgroundEnd:'accent', titleText:'light', subtitle:'light' });
initial.fonts = { heading:'raleway', body:'source-sans-3' }; initial.background = 'crosshatch';
initial.samples.title = 'Make room for your next step'; initial.samples.subtitle = 'A sample lesson for a confident start';
initial.slides.title.colors = 'gradient';
const payload = design => ({ schema:'bespoke-selection/v2', date:'2026-09-24', submittedAt:'2026-09-24T16:30:00.000Z', lesson:legacy.lesson, team:legacy.team, design });
const server = await createDevServer({ port:0 }), browser = await browserType.launch();
const contexts = [];
async function editor(width) {
  const context = await browser.newContext({ viewport:{width,height:1080}, reducedMotion:'reduce' }); contexts.push(context);
  await context.addInitScript(() => window.__bespokeAutosave = {enabled:false});
  await context.route(/^https?:/, route => new URL(route.request().url()).origin === server.baseUrl ? route.continue() : route.abort());
  const page = await context.newPage(); page.on('dialog', dialog => dialog.accept());
  await page.goto(server.baseUrl+'/bespoke/'); await page.locator('#localPreviewNotice').waitFor();
  await page.locator('#btnSave').filter({hasText:'Save test design'}).waitFor({state:'attached'});
  return page;
}
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem('bespoke-draft-v2')).design);
const go = builderDestination;
async function choice(page, group, value) {
  if(await page.locator('#surface-design').isVisible()) await page.locator('#surface-design').click();
  await page.getByRole('group', {name:new RegExp(group)}).locator('[data-choice="'+value+'"]').click();
}
async function measure(locator, canonical = false) {
  return locator.evaluate((el, canonical) => {
    const r = el.getBoundingClientRect(), style = getComputedStyle(el);
    const box = selector => { const node = el.querySelector(selector), b = node.getBoundingClientRect(), css=getComputedStyle(node), range=document.createRange();range.selectNodeContents(node);const lines=[...range.getClientRects()].map(line=>({x:line.x-r.x,y:line.y-r.y,w:line.width,h:line.height}));return {x:b.x-r.x,y:b.y-r.y,w:b.width,h:b.height,font:css.fontSize,align:css.textAlign,color:css.color,lines}; };
    return {w:r.width,h:r.height,scrollW:el.scrollWidth,scrollH:el.scrollHeight,background:style.backgroundImage,
      title:box(canonical?'h1':'.slide-title-text'), subtitle:box(canonical?'.subtitle':'.slide-subtitle'), logo:box(canonical?'.logo':'.slide-logo'), rule:box(canonical?'.divider':'.slide-accent')};
  }, canonical);
}
function contained(m, label) {
  for(const name of ['title','subtitle','logo','rule']) {
    const b=m[name]; assert(b.x>=-1 && b.y>=-1 && b.x+b.w<=m.w+1 && b.y+b.h<=m.h+1, `${label}: ${name} escaped ${JSON.stringify(m)}`);
  }
  assert(m.scrollW<=m.w+1 && m.scrollH<=m.h+1, label+': content clipped/overflowed');
  const a=m.logo,b=m.title;
  assert(a.x+a.w<=b.x+1 || b.x+b.w<=a.x+1 || a.y+a.h<=b.y+1 || b.y+b.h<=a.y+1, label+': title overlaps logo');
  assert(m.subtitle.y>=m.title.y+m.title.h, label+': subtitle overlaps title');
}
function distinct(values, label) {
  const {center,left,bottom,split}=values;
  assert(center.title.lines.at(-1).x>left.title.lines.at(-1).x+left.w*.03, label+': centered title glyphs must move horizontally');
  assert(center.subtitle.lines.at(-1).x>left.subtitle.lines.at(-1).x+left.w*.03, label+': centered subtitle glyphs must move horizontally');
  assert(Math.abs(center.title.x+center.title.w/2-center.w/2)<2, label+': heading must center on canvas');
  assert(bottom.title.y>left.title.y+24 && bottom.subtitle.y>left.subtitle.y+24, label+': bottom choice must visibly lower both text elements');
  assert(split.title.x>split.w*.40 && split.subtitle.x>split.w*.40, label+': split copy belongs in the second panel');
  assert(split.background.includes('38%'), label+': split needs a visible panel boundary');
}
async function captureTitle(locator) {
  // Locator screenshots scroll just enough to expose the element, which can put
  // its top edge underneath the phone's sticky Design/Preview switcher. Keep the
  // real UI visible and position the whole normal-copy canvas below that bar.
  await locator.evaluate(el=>{
    const r=el.getBoundingClientRect(),bar=document.querySelector('#surfaceSwitcher'),barHeight=bar?.getBoundingClientRect().height||0;
    const inset=barHeight+8,available=innerHeight-inset-8;
    const top=inset+Math.max(0,(available-r.height)/2);
    window.scrollBy({top:r.top-top,behavior:'instant'});
  });
  const geometry=await locator.evaluate(el=>{
    const r=el.getBoundingClientRect(),bar=document.querySelector('#surfaceSwitcher')?.getBoundingClientRect();
    const points=[.365,.395].map(x=>{const hit=document.elementFromPoint(r.x+r.width*x,r.y+r.height*.035);return {x:r.x+r.width*x,y:r.y+r.height*.035,unobstructed:!!hit&&el.contains(hit),hit:hit?.id||hit?.className||hit?.tagName};});
    return {top:r.top,bottom:r.bottom,height:r.height,viewport:innerHeight,barBottom:bar?.height?bar.bottom:0,points};
  });
  assert(geometry.top>=geometry.barBottom && geometry.bottom<=geometry.viewport+1, 'The complete title canvas must fit below the sticky editor controls: '+JSON.stringify(geometry));
  assert(geometry.points.every(point=>point.unobstructed), 'Title pixel samples must hit the slide, not overlapping editor controls: '+JSON.stringify(geometry));
  return {png:await locator.screenshot(),geometry};
}
async function seam(page, locator) {
  const {png,geometry}=await captureTitle(locator);
  const pixels=await page.evaluate(async encoded=>{
    const bitmap=await createImageBitmap(new Blob([Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))],{type:'image/png'}));
    const canvas=document.createElement('canvas'); canvas.width=bitmap.width;canvas.height=bitmap.height;
    const c=canvas.getContext('2d');c.drawImage(bitmap,0,0);bitmap.close();
    const pixel=x=>c.getImageData(Math.round(canvas.width*x),Math.round(canvas.height*.035),1,1).data;
    const a=[...pixel(.365)],b=[...pixel(.395)];return {left:a,right:b,delta:Math.max(...[0,1,2].map(i=>Math.abs(a[i]-b[i])))};
  },png.toString('base64'));
  evidence.push({source:'split-pixels',geometry,...pixels});
  assert(pixels.delta>=12, 'Actual split-panel pixels must show a color boundary: '+JSON.stringify(pixels));
  return png;
}
try {
  for(const width of [1920,1100,390]) {
    const page=await editor(width);
    await page.locator('#teamFileInput').setInputFiles({name:'synthetic-title.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload(initial)))});
    await page.locator('#fileStatus').filter({hasText:'Opened synthetic-title.json.'}).waitFor();
    await go(page,'Title slide');
    let canvasWidth;
    for(const logo of logos) {
      await choice(page,'Logo position',logo);
      const values={};
      for(const layout of layouts) {
        await choice(page,'Arrangement',layout);
        assert.deepEqual(await saved(page), {...initial,startingPoint:'custom',slides:{...initial.slides,title:{...initial.slides.title,layout,logo}}});
        if(width===390)await switchSurface(page,'preview');
        await page.evaluate(()=>document.fonts.ready);
        const slide=page.locator('#modelStage [data-kind="title"]'), m=await measure(slide);canvasWidth=m.w;
        contained(m, `editor ${width}/${logo}/${layout}`);values[layout]=m;
        assert.equal(m.title.color,'rgb(255, 255, 255)');assert.equal(m.subtitle.color,'rgb(255, 255, 255)');
        assert(await page.locator('#modelStage .slide-title-text').evaluate(el=>getComputedStyle(el).fontFamily.includes('Raleway')));
        assert((m.background.match(/linear-gradient/g)||[]).length>=3, 'Both pattern axes stay over the gradient');
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1), 'Editor stays inside viewport');
        if(logo==='corner')assert(m.logo.y<30, 'Corner logo stays at the top independently of text arrangement');
        else assert(m.logo.y+m.logo.h<m.title.y, 'Above-title logo stays in its own row');
        const png=layout==='split'?await seam(page,slide):(await captureTitle(slide)).png;
        if(output && logo==='corner')await fs.writeFile(path.join(output,`title-${width}-${layout}.png`),png);
        if(output && logo==='corner' && layout==='bottom')await page.screenshot({path:path.join(output,`title-page-${width}.png`),fullPage:true});
      }
      distinct(values,`editor ${width}/${logo}`);evidence.push({source:'editor',width,logo,values});
    }
    const final=await saved(page);
    if(await page.locator('#surface-design').isVisible())await page.locator('#surface-design').click();
    await page.locator('#btnUndo').click(); assert.equal((await saved(page)).slides.title.layout,'bottom');
    await page.locator('#btnRedo').click(); assert.deepEqual(await saved(page),final);
    await go(page,'Shared typography');await go(page,'Title slide');assert.deepEqual(await saved(page),final);
    const response=page.waitForResponse(r=>r.url().endsWith('/api/bespoke')&&r.request().postDataJSON()?.action==='save');
    await page.locator('#btnSave').click();assert.equal((await response).status(),200);
    await page.locator('#toast').filter({hasText:/Local test design saved|already up to date/}).waitFor();
    await page.reload();await page.locator('#localPreviewNotice').waitFor();assert.deepEqual(await saved(page),final);
    const reopen=await editor(width);await go(reopen,'Title slide');assert.deepEqual(await saved(reopen),final);

    // Same semantics in generated sample markup and the actual canonical title markup/base CSS.
    const generatedPage=await page.context().newPage();
    for(const long of [false,true]) for(const logo of logos) {
      const values={sample:{},canonical:{}};
      for(const layout of layouts) {
        const design=structuredClone(initial);Object.assign(design.slides.title,{layout,logo});
        if(long){design.samples.title='Building confidence and practical workplace skills together '.repeat(5).slice(0,catalog.sampleLimits.title);design.samples.subtitle='Choose a next step and put your plan into practice with your team. '.repeat(9).slice(0,catalog.sampleLimits.subtitle);}
        const generated=JSON.parse(execFileSync(process.execPath,['scripts/bespoke-model-bridge.mjs','design'],{cwd:root,input:JSON.stringify(payload(design)),encoding:'utf8'}));assert.deepEqual(generated.errors,[]);
        for(const canonical of [false,true]) {
          const markup=canonical?templateTitle.replace('{{LESSON_TITLE}}',design.samples.title).replace('{{SUBTITLE}}',design.samples.subtitle):generated.markup.title;
          await generatedPage.setContent(`<html><head><base href="${server.baseUrl}/bespoke/"><style>${canonical?templateCss:''}</style><style>html,body{margin:0;padding:0} .geometry-stage{width:${canvasWidth}px;max-width:100%} *,*::before,*::after{animation:none!important;transition:none!important}</style><style>${generated.css}</style></head><body><div class="geometry-stage">${markup}</div></body></html>`);
          await generatedPage.evaluate(()=>document.fonts.ready);
          const m=await measure(generatedPage.locator(canonical?'.slide-title':'[data-kind="title"]'),canonical);
          contained(m,`${canonical?'canonical':'sample'} ${width}/${logo}/${layout}/${long?'long':'normal'}`);
          values[canonical?'canonical':'sample'][layout]=m;
        }
      }
      if(!long)for(const [source,measures] of Object.entries(values))distinct(measures,`${source} ${width}/${logo}`);
      evidence.push({source:'generated',width,logo,long,values});
    }
    console.log(`PASS title layouts at ${width}px: measured arrangement/logo geometry, split pixels, state preservation, history/save/reload and generated long-copy containment`);
  }
  if(output)await fs.writeFile(path.join(output,'title-geometry.json'),JSON.stringify(evidence,null,2));
} finally {for(const context of contexts)await context.close();await browser.close();await server.close();}
