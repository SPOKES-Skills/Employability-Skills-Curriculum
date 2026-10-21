#!/usr/bin/env node
// Browser checks that the slide comes first: every showcase render fills its frame, Make it yours keeps the
// whole slide on screen and larger than the toolbar band (Ruling R21), and Pick a look shows its stage and
// strip together on a 1024x768 laptop. The rest of the showcase suite is in test-bespoke-showcase.mjs.
import assert from 'node:assert/strict';
import {createDevServer} from './bespoke-dev-server.mjs';
import {browserType} from './bespoke-test-browser.mjs';
import {frameGaps, settle} from './bespoke-test-chrome.mjs';
import {MIN_SCALE} from '../bespoke/canvas-fit.mjs';

const server = await createDevServer({port: 0});
const browser = await browserType.launch({headless: true});
const errors = [];
const open = async (width, height) => {
  const context = await browser.newContext({viewport: {width, height}, reducedMotion: 'reduce'});
  await context.addInitScript(() => { window.__bespokeAutosave = {enabled: false}; });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(server.baseUrl + '/bespoke/');
  await page.locator('#localPreviewNotice').waitFor({state: 'visible'});
  return {context, page};
};
const rect = (page, selector) => page.locator(selector).first().evaluate(el => {
  const r = el.getBoundingClientRect();
  return {left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height};
});
const failures = [];
// Each case runs on its own, so one failure still lets the others report.
const check = async (name, body) => {
  try { await body(); console.log('ok - ' + name); }
  catch (error) { failures.push(name); console.log(`not ok - ${name}: ${error.message}`); }
};
const SIZES = [[1440, 900], [1280, 800], [1024, 768]];

// Every frame matching selector holds a slide that meets it within 1px on all four sides.
const assertFilled = async (page, selector, where, least) => {
  const frames = await frameGaps(page, selector);
  assert.ok(frames.length >= least, `${where}: ${selector} shows at least ${least} renders, got ${frames.length}`);
  for (const {name, gaps} of frames) {
    assert.ok(gaps, `${where}: ${name} holds a slide`);
    assert.ok(gaps.every(gap => Math.abs(gap) <= 1), `${where}: ${name} slide meets its frame (top, right, bottom, left gaps ${gaps.join(', ')})`);
  }
};

// Rows the docked toolbar's visible items take. Items in one row share a bottom edge (the band aligns them to
// the end), so a new row starts wherever the next bottom edge is more than 8px lower.
const toolbarRows = page => page.locator('#contextToolbar').evaluate(toolbar => [...toolbar.children]
  .filter(el => el.getBoundingClientRect().height > 0)
  .map(el => el.getBoundingClientRect().bottom).sort((a, b) => a - b)
  .filter((bottom, i, all) => i === 0 || bottom - all[i - 1] > 8).length);

try {
  await check('slide renders fill their frames', async () => {
    // Title, Divider, Text boxes, Video and Activity renders, for the applied look and the tallest and shortest titles.
    for (const [width, height] of [...SIZES, [390, 844]]) {
      const {context, page} = await open(width, height);
      await page.locator('#stage-start').click();
      for (const look of ['', 'masthead', 'plaque']) {
        if (look) await page.locator('#preset-' + look).hover();
        await settle(page);
        const where = `${width}x${height} Pick a look ${look || 'applied'}`;
        await assertFilled(page, '#lookStage .look-hero:not(.look-leaving)', where, 1);
        await assertFilled(page, '#lookSide .look-mini', where, 4);
        await assertFilled(page, '#lookStrip .look-thumb', where, 12);
      }
      await page.locator('#stage-review').click();
      await settle(page);
      await assertFilled(page, '#sendDeck .send-frame', `${width}x${height} Send`, 5);
      await context.close();
    }
  });
  await check('the slide stays on screen on Make it yours', async () => {
    for (const [width, height] of SIZES) {
      const {context, page} = await open(width, height);
      await page.locator('#stage-slides').click();
      for (const drawer of ['closed', 'open']) {
        for (const [view, target] of [['title', '#modelStage .slide-title-text'], ['cards', '#modelStage .slide-card .slide-body']]) {
          await page.locator(`#previewTabs [data-view=${view}]`).click();
          await page.locator(target).first().click();
          if (drawer === 'open' && await page.locator('#workspace').getAttribute('data-options') !== 'true') await page.locator('#btnMoreOptions').click();
          await page.evaluate(() => window.scrollTo(0, 0));
          await settle(page);
          const where = `${width}x${height}, drawer ${drawer}, ${view}`;
          const slide = await rect(page, '#modelStage .bespoke-slide'), toolbar = await rect(page, '#contextToolbar');
          const band = await rect(page, '#previewToolbarMount');
          assert.ok(slide.top >= 0 && slide.bottom <= height, `${where}: the whole slide is in the window at scroll 0, top ${slide.top}, bottom ${slide.bottom}`);
          assert.ok(slide.height > band.height, `${where}: the slide (${slide.height}px) is taller than the toolbar band (${band.height}px)`);
          assert.ok(toolbar.top >= 0 && toolbar.bottom <= height, `${where}: the toolbar is in the window, top ${toolbar.top}, bottom ${toolbar.bottom}`);
          assert.ok(toolbar.bottom <= slide.top, `${where}: the toolbar sits above the slide`);
          assert.ok(await toolbarRows(page) <= 2, `${where}: the toolbar takes at most two rows, got ${await toolbarRows(page)}`);
        }
      }
      await context.close();
    }
  });
  await check('Sample text and Position wait behind More options below 1101px', async () => {
    // Below 1101px the band keeps Editing, Font, Size, Text color and Align; Sample text and Position wait in the drawer.
    for (const [width, height, inBand] of [[1440, 900, true], [1024, 768, false]]) {
      const {context, page} = await open(width, height);
      await page.locator('#stage-slides').click();
      await page.locator('#modelStage .slide-title-text').click();
      for (const id of ['#context-text', '#context-placement'])
        assert.equal(await page.locator('#contextToolbar ' + id).count(), inBand ? 1 : 0, `${width}: ${id} ${inBand ? 'is in' : 'leaves'} the band`);
      if (!inBand) {
        await page.locator('#btnMoreOptions').click();
        for (const id of ['#context-text', '#context-placement']) {
          const field = page.locator('#inspectorMore ' + id);
          assert.ok(await field.isVisible(), `${width}: ${id} is in the Slide options drawer after More options`);
          await field.focus();
          assert.equal(await page.evaluate(() => document.activeElement.id), id.slice(1), `${width}: ${id} takes keyboard focus`);
        }
      }
      await context.close();
    }
  });
  await check('a slide too heavy to fit legibly stays full size', async () => {
    // Ruling R23: the slide shrinks only while it stays legible; otherwise it keeps full size and the page scrolls.
    const shown = async (page, where) => {
      await page.evaluate(() => window.scrollTo(0, 0));
      await settle(page);
      const m = await page.locator('#modelStage .bespoke-slide').evaluate(el => {
        const r = el.getBoundingClientRect();
        return {scale: r.height / el.offsetHeight, top: r.top, bottom: r.bottom, innerHeight};
      });
      const full = Math.abs(m.scale - 1) < 0.001;
      const fitted = m.scale >= MIN_SCALE - 0.001 && m.top >= 0 && m.bottom <= m.innerHeight;
      assert.ok(full || fitted, `${where}: scale ${m.scale.toFixed(3)} is full size, or at least ${MIN_SCALE} with the slide in the window (top ${m.top}, bottom ${m.bottom})`);
      return m;
    };
    {
      const {context, page} = await open(768, 900);
      await page.addStyleTag({content: 'html{font-size:200%!important}'});
      await page.locator('#stage-slides').click();
      await page.locator('#modelStage .slide-title-text').click();
      const m = await shown(page, '768x900 at 200% text');
      assert.ok(Math.abs(m.scale - 1) < 0.001, `768x900 at 200% text: enlarged text skips the fit, scale ${m.scale}`);
      await context.close();
    }
    {
      const {context, page} = await open(1920, 1080);
      await page.locator('#stage-slides').click();
      await page.locator('#previewTabs [data-view=cards]').click();
      const boxes = await page.locator('#modelStage .slide-card .slide-body').count();
      for (let i = 0; i < boxes; i++) {
        await page.locator('#modelStage .slide-card .slide-body').nth(i).click();
        const limit = Number(await page.locator('#context-text').getAttribute('maxlength'));
        await page.locator('#context-text').fill('Consider a practical next step. '.repeat(60).slice(0, limit));
        await page.locator('#context-text').blur();
      }
      // Three full boxes still fit at a legible scale here; the floor fallback itself is covered in test-bespoke-canvas-fit.mjs.
      await shown(page, '1920x1080 with the longest box text');
      await context.close();
    }
  });
  await check('Pick a look shows stage and strip together at 1024', async () => {
    const {context, page} = await open(1024, 768);
    await page.locator('#stage-start').click();
    await settle(page);
    assert.equal(await page.evaluate(() => scrollY), 0, 'Pick a look opens at the top');
    const stage = await rect(page, '#lookStage'), card = await rect(page, '#lookStrip > [data-look]');
    assert.ok(stage.top >= 0 && stage.bottom <= 768, `the stage is in the window, top ${stage.top}, bottom ${stage.bottom}`);
    assert.ok(card.top >= 0 && card.bottom <= 768, `the first row of looks is in the window, top ${card.top}, bottom ${card.bottom}`);
    const go = await rect(page, '#btnMakeItOurs');
    assert.ok(go.left >= 0 && go.right <= 1024, `Make it ours is inside the window width, left ${go.left}, right ${go.right}`);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no sideways page scroll');
    await context.close();
  });
  assert.deepEqual(errors, [], 'no page errors');
  assert.deepEqual(failures, [], 'every case passes');
} finally {
  await browser.close();
  await server.close?.();
}
