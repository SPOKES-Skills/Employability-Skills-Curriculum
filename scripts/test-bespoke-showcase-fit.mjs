#!/usr/bin/env node
// Browser checks that the slide comes first: every showcase render fills its frame, Make it yours draws the
// slide on the same 960 canvas (Ruling R26) and keeps all of it on screen and larger than the toolbar band
// (Ruling R21), and Pick a look shows its stage and strip together on a 1024x768 laptop. The rest of the showcase suite is in test-bespoke-showcase.mjs.
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
          // The whole slide shows, or (R24) it holds at the floor with at most a fifth below the fold. Which one
          // depends on the room the chrome leaves, and classic scrollbars (Linux, Windows) leave less than macOS.
          const scale = await page.locator('#modelStage .bespoke-slide').evaluate(el => el.getBoundingClientRect().height / el.offsetHeight);
          const held = Math.abs(scale - MIN_SCALE) < 0.001 && slide.top >= 0 && slide.bottom - height <= slide.height / 5;
          assert.ok((slide.top >= 0 && slide.bottom <= height) || held, `${where}: the whole slide is in the window at scroll 0, or held at the floor with at most a fifth below: scale ${scale.toFixed(3)}, top ${slide.top}, bottom ${slide.bottom}`);
          assert.ok(slide.height > band.height, `${where}: the slide (${slide.height}px) is taller than the toolbar band (${band.height}px)`);
          assert.ok(toolbar.top >= 0 && toolbar.bottom <= height, `${where}: the toolbar is in the window, top ${toolbar.top}, bottom ${toolbar.bottom}`);
          assert.ok(toolbar.bottom <= slide.top, `${where}: the toolbar sits above the slide`);
          assert.ok(await toolbarRows(page) <= 2, `${where}: the toolbar takes at most two rows, got ${await toolbarRows(page)}`);
        }
      }
      await context.close();
    }
  });
  await check('Make it yours draws the slide on the 960 canvas, shaped as on Send (Ruling R26)', async () => {
    for (const [width, height] of [[1280, 800], [1024, 768]]) {
      const {context, page} = await open(width, height);
      await page.locator('#stage-review').click();
      await settle(page);
      const send = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('#sendDeck .send-slide')]
        .map(item => { const r = item.querySelector('.send-frame').getBoundingClientRect(); return [item.dataset.kind, r.width / r.height]; })));
      await page.locator('#stage-slides').click();
      for (const drawer of ['closed', 'open']) {
        for (const [view, target] of [['title', '#modelStage .slide-title-text'], ['cards', '#modelStage .slide-card .slide-body']]) {
          await page.locator(`#previewTabs [data-view=${view}]`).click();
          await page.locator(target).first().click();
          if ((drawer === 'open') !== (await page.locator('#workspace').getAttribute('data-options') === 'true')) await page.locator('#btnMoreOptions').click();
          await page.evaluate(() => window.scrollTo(0, 0));
          await settle(page);
          const where = `${width}x${height}, drawer ${drawer}, ${view}`;
          const m = await page.locator('#modelStage .bespoke-slide').evaluate(el => {
            const r = el.getBoundingClientRect(), frame = el.closest('.preview-frame'), selected = el.closest('#modelStage').querySelector('.editor-selected');
            const f = frame.getBoundingClientRect(), pad = parseFloat(getComputedStyle(frame).paddingLeft) + parseFloat(getComputedStyle(frame).paddingRight);
            return {w: el.offsetWidth, h: el.offsetHeight, scale: r.width / el.offsetWidth, shown: r.width, mat: f.width - pad, outline: parseFloat(getComputedStyle(selected).outlineWidth)};
          });
          assert.equal(m.w, 960, `${where}: the slide lays out 960px wide, got ${m.w}`);
          const shape = m.w / m.h;
          assert.ok(Math.abs(shape / send[view] - 1) <= 0.01, `${where}: the slide's shape ${shape.toFixed(3)} matches Send's ${send[view].toFixed(3)}`);
          assert.ok(Math.abs(m.mat - m.shown) <= 1, `${where}: the mat (${m.mat}px inside) hugs the ${m.shown}px slide`);
          assert.ok(m.outline * m.scale >= 3, `${where}: the selection outline shows ${(m.outline * m.scale).toFixed(2)}px at scale ${m.scale.toFixed(3)}`);
        }
      }
      await context.close();
    }
  });
  await check('a wide window grows the slide past 960 while all of it shows (Ruling R30)', async () => {
    const {context, page} = await open(1920, 1080);
    await page.locator('#stage-slides').click();
    await page.locator('#previewTabs [data-view=cards]').click();
    await page.locator('#modelStage .slide-card .slide-body').first().click();
    for (const drawer of ['closed', 'open']) {
      if (drawer === 'open') await page.locator('#btnMoreOptions').click();
      await page.evaluate(() => window.scrollTo(0, 0));
      await settle(page);
      const m = await page.locator('#modelStage .bespoke-slide').evaluate(el => {
        const r = el.getBoundingClientRect();
        return {w: el.offsetWidth, shown: r.width, top: r.top, bottom: r.bottom};
      });
      const where = `1920x1080, drawer ${drawer}`;
      assert.equal(m.w, 960, `${where}: the slide lays out on the 960 canvas`);
      assert.ok(m.shown > 1000, `${where}: the slide shows wider than 960, got ${m.shown}`);
      assert.ok(m.top >= 0 && m.bottom <= 1080, `${where}: all of the slide is in the window, top ${m.top}, bottom ${m.bottom}`);
    }
    await context.close();
  });
  await check('a column too narrow for a legible 960 canvas lays the slide out at its width (Ruling R31)', async () => {
    for (const [width, height] of [[768, 1024], [834, 1112]]) {
      const {context, page} = await open(width, height);
      await page.locator('#stage-slides').click();
      await page.locator('#previewTabs [data-view=cards]').click();
      await page.locator('#modelStage .slide-card .slide-body').first().click();
      await page.locator('#btnMoreOptions').click();
      await page.evaluate(() => window.scrollTo(0, 0));
      await settle(page);
      const m = await page.locator('#modelStage .bespoke-slide').evaluate(el => {
        const frame = el.closest('.preview-frame'), pane = frame.parentElement, p = getComputedStyle(pane), f = getComputedStyle(frame);
        const room = pane.clientWidth - parseFloat(p.paddingLeft) - parseFloat(p.paddingRight) - parseFloat(f.paddingLeft) - parseFloat(f.paddingRight);
        return {w: el.offsetWidth, room, scale: el.getBoundingClientRect().width / el.offsetWidth,
          sidebar: getComputedStyle(el.querySelector('.slide-sidebar')).display, disclosure: getComputedStyle(el.querySelector('.slide-sidebar-disclosure')).display};
      });
      const where = `${width}x${height}, drawer open`;
      assert.ok(m.room < 960 * MIN_SCALE, `${where}: the column (${m.room}px) is too narrow for the 960 canvas at the floor`);
      assert.ok(Math.abs(m.w - m.room) <= 1, `${where}: the slide lays out at the column width ${m.room}, got ${m.w}`);
      assert.ok(m.scale >= MIN_SCALE - 0.001, `${where}: the slide is never shown below the floor, scale ${m.scale.toFixed(3)}`);
      assert.ok(m.sidebar === 'none' && m.disclosure !== 'none', `${where}: the narrow slide uses its sidebar sample menu (sidebar ${m.sidebar}, menu ${m.disclosure})`);
      await context.close();
    }
  });
  await check('the Navigation sidebar is selectable at 1024 with the drawer open', async () => {
    const {context, page} = await open(1024, 768);
    await page.locator('#stage-slides').click();
    await page.locator('#previewTabs [data-view=cards]').click();
    await page.locator('#modelStage .slide-card .slide-body').first().click();
    await page.locator('#btnMoreOptions').click();
    await page.locator('#selectedElement').selectOption('sidebar');
    await settle(page);
    const m = await page.locator('#modelStage').evaluate(stage => {
      const nav = stage.querySelector('.slide-sidebar'), picked = stage.querySelector('.editor-selected');
      return {nav: getComputedStyle(nav).display, picked: picked?.className, height: picked?.getBoundingClientRect().height};
    });
    assert.notEqual(m.nav, 'none', 'the slide shows its sidebar');
    assert.match(m.picked, /slide-sidebar(?!-)/, `Editing selects the sidebar itself, got ${m.picked}`);
    assert.ok(m.height >= 40, `the selected sidebar is ${m.height}px tall`);
    await context.close();
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
  await check('a band above the workspace refits the slide by the floor-and-hold rule (R24)', async () => {
    // Ruling R24. Hosted sessions can show a status notice or the receipt band above the workspace; the local
    // preview shows neither, so the test raises the #fileStatus notice the page uses for status text.
    const scales = [];
    for (const drawer of ['closed', 'open']) {
      const {context, page} = await open(1024, 768);
      await page.locator('#stage-slides').click();
      await page.locator('#previewTabs [data-view=cards]').click();
      await page.locator('#modelStage .slide-card .slide-body').first().click();
      if (drawer === 'open') await page.locator('#btnMoreOptions').click();
      const measure = async () => {
        await page.evaluate(() => window.scrollTo(0, 0));
        await settle(page);
        return page.locator('#modelStage .bespoke-slide').evaluate(el => {
          const r = el.getBoundingClientRect();
          return {scale: r.height / el.offsetHeight, top: r.top, bottom: r.bottom, height: r.height};
        });
      };
      const where = `1024x768, drawer ${drawer}, Text boxes`;
      await page.evaluate(() => { const note = document.getElementById('fileStatus'); note.textContent = 'Synthetic status notice for the fit test.'; note.hidden = false; });
      const banded = await measure();
      const band = await rect(page, '#fileStatus');
      assert.ok(band.height >= 30, `${where}: the notice shows above the workspace, ${band.height}px tall`);
      // R24: a slide that fits shows whole; one that does not holds at the floor while at most a fifth falls below
      // the fold; past that it falls back to full size (the column width) and the page scrolls.
      const r24 = m => (m.top >= 0 && m.bottom <= 768) || (m.scale >= MIN_SCALE - 0.001 && m.bottom - 768 <= m.height / 5)
        || (m.scale > MIN_SCALE + 0.001 && m.bottom - 768 > m.height / 5);
      assert.ok(banded.scale >= MIN_SCALE - 0.001, `${where}: with the notice the slide is never below the floor: ${banded.scale.toFixed(3)}`);
      assert.ok(r24(banded), `${where}: with the notice the slide fits, holds at the floor, or falls back to full size: ${JSON.stringify(banded)}`);
      await page.evaluate(() => { document.getElementById('fileStatus').hidden = true; });
      const clear = await measure();
      assert.ok(r24(clear) && clear.scale >= MIN_SCALE - 0.001, `${where}: without the notice the slide refits by the same rule: ${JSON.stringify(clear)}`);
      scales.push({banded: banded.scale, clear: clear.scale});
      await context.close();
    }
    // The notice takes room from the Text boxes slide, so in at least one case the scale changes when it goes: the
    // fit watches the bands above the workspace (R24). Which branch each case lands on depends on the platform's room.
    const shown = scales.map(x => `${x.banded.toFixed(3)} to ${x.clear.toFixed(3)}`).join(', ');
    assert.ok(scales.some(x => Math.abs(x.clear - x.banded) > 0.001), `one case refits once the notice goes: ${shown}`);
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
