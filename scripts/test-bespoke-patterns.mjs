#!/usr/bin/env node
// Bounded visual matrix: real pixels, safe sample text, local-only assets, no user state.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import catalog from '../bespoke/builder-catalog.json' with { type: 'json' };
import { defaultDesign, cssForDesign, renderSlide, contrastIssues } from '../bespoke/builder-model.mjs';
import { createDevServer } from './bespoke-dev-server.mjs';
import { pixelDifference } from './bespoke-pixel-check.mjs';
const root = path.resolve(import.meta.dirname, '..');
const patterns = catalog.backgrounds.map(p => p.id);
const bases = ['light', 'muted', 'accent', 'primary', 'dark', 'royal', 'mauve'];
const server = await createDevServer({ port: 0 });
const browser = await chromium.launch();
const evidence = [], images = [];
const evidenceDir = process.env.BESPOKE_REVIEW_DIR;
if (evidenceDir) await fs.mkdir(evidenceDir, { recursive: true });
const legacy = JSON.parse(await fs.readFile(path.join(root, 'scripts/test-fixtures/bespoke/selection-money-management.json')));
const generatedCache = new Map();
function generatedFor(design) {
  const key = JSON.stringify(design);
  if (!generatedCache.has(key)) {
    const selection = { schema:'bespoke-selection/v2', date:'2026-09-24', submittedAt:'2026-09-24T16:30:00.000Z', lesson:legacy.lesson, team:legacy.team, design };
    const generated = JSON.parse(execFileSync(process.execPath, ['scripts/bespoke-model-bridge.mjs','design'], { cwd:root, input:JSON.stringify(selection), encoding:'utf8' }));
    assert.deepEqual(generated.errors, []); generatedCache.set(key, generated);
  }
  return generatedCache.get(key);
}
let count = 0, parity = 0;
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: { width: mobile ? 390 : 1440, height: 1000 }, reducedMotion: 'reduce' });
    await context.route(/^https?:/, route => new URL(route.request().url()).origin === server.baseUrl ? route.continue() : route.abort());
    const page = await context.newPage(); await page.goto(server.baseUrl + '/bespoke/');
    const width = mobile ? 342 : 720;
    async function show(design, kind = 'divider', generated) {
      const css = generated?.css || cssForDesign(catalog, design, { canonical: false, fontBase: '/fonts' });
      const markup = generated?.markup[kind] || renderSlide(catalog, design, kind);
      await page.setContent(`<html><head><base href="${server.baseUrl}/bespoke/"><style>body{margin:0}main{width:${width}px}</style><style>${css}</style></head><body><main>${markup}</main></body></html>`);
      await page.evaluate(() => document.fonts.ready);
      return page.locator('.bespoke-slide').screenshot();
    }
    for (const base of bases) {
      const design = defaultDesign(catalog);
      design.roles.dividerBackground = base;
      design.roles.titleBackground = base; design.roles.titleBackgroundEnd = base;
      design.roles.titleText = design.roles.subtitle = ['light', 'muted', 'accent'].includes(base) ? 'royal' : 'light';
      design.slides.title.colors = design.slides.divider.colors = 'solid';
      design.fonts = { heading: 'raleway', body: 'source-sans-3' };
      const original = structuredClone(design), shots = new Map();
      for (const pattern of patterns) {
        design.background = pattern;
        assert.deepEqual(contrastIssues(catalog, design), [], `${base}/${pattern} readability`);
        const shot = await show(design); shots.set(pattern, shot); count++;
        const artifact = await show(design, 'divider', generatedFor(design));
        assert.equal((await pixelDifference(page, shot, artifact)).meanChannelDelta, 0, `${base}/${pattern}: artifact differs from the preview`); parity++;
        if (evidenceDir && ['light', 'accent', 'royal'].includes(base)) {
          const filename = `${mobile?'phone':'desktop'}-${base}-${pattern}.png`;
          await fs.writeFile(path.join(evidenceDir, filename), shot);
          images.push({ mobile, base, pattern, filename });
        }
        const computed = await page.locator('.bespoke-slide').evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, heading: getComputedStyle(el.querySelector('h2')).color, font: getComputedStyle(el.querySelector('h2')).fontFamily, body: getComputedStyle(el.querySelector('p')).fontFamily }));
        const rgb = id => 'rgb(' + [1, 3, 5].map(i => parseInt(catalog.palette.find(c => c.id === id).hex.slice(i, i+2), 16)).join(', ') + ')';
        assert.equal(computed.bg, rgb(base)); assert.equal(computed.heading, rgb(original.roles.titleText));
        assert.match(computed.font, /Raleway/); assert.match(computed.body, /Source Sans 3/);
      }
      for (let i = 0; i < patterns.length; i++) for (let j = i+1; j < patterns.length; j++) {
        const diff = await pixelDifference(page, shots.get(patterns[i]), shots.get(patterns[j]));
        // Structures stay in the outer margin: a 15px color block on a 720px slide covers about 0.09% of the canvas.
        assert(diff.changedFraction >= .0005 && diff.meanChannelDelta >= .05, `${mobile?'phone':'desktop'} ${base} ${patterns[i]} vs ${patterns[j]}: ${JSON.stringify(diff)}`);
        evidence.push({ mobile, base, first: patterns[i], second: patterns[j], ...diff });
      }
      design.background = 'plain';
      assert.deepEqual(await pixelDifference(page, shots.get('plain'), await show(design)), { width, height: mobile ? 300 : 360, changedFraction: 0, meanChannelDelta: 0 }, 'Plain removes every texture layer.');
      assert.deepEqual(design, original, 'Visual generation never rewrites saved choices.');
    }
    // Verify shared CSS/markup against the production bridge, at both preview sizes.
    for (const kind of ['title', 'divider', 'cards', 'video', 'activity']) {
      const design = defaultDesign(catalog); design.background = 'crosshatch';
      if (kind === 'title') design.slides.title.layout = 'split';
      if (kind === 'divider') { design.slides.divider.layout = 'band'; design.slides.divider.colors = 'gradient'; }
      const generated = generatedFor(design);
      const preview = await show(design, kind), artifact = await show(design, kind, generated);
      const diff = await pixelDifference(page, preview, artifact);
      assert.equal(diff.changedFraction, 0, `${kind}: artifact/preview pixels differ`);
      assert.equal(diff.meanChannelDelta, 0);
      const plain = await show({ ...design, background:'plain' }, kind);
      assert((await pixelDifference(page, preview, plain)).changedFraction > .018, `${kind}: pattern must be visible outside reading surfaces`);
      parity++;
    }
    // A frame on a content slide encloses the area beside the sidebar column; it never runs under the sidebar.
    for (const kind of ['cards', 'video', 'activity']) {
      const design = defaultDesign(catalog); design.background = 'frame';
      await show(design, kind);
      const found = await page.evaluate(() => {
        const root = document.querySelector('.bespoke-slide'), content = root.querySelector('.slide-content'), side = root.querySelector('.slide-sidebar');
        return { rootImage: getComputedStyle(root).backgroundImage, layers: (getComputedStyle(content).backgroundImage.match(/linear-gradient/g) || []).length, contentLeft: content.getBoundingClientRect().left, sidebarRight: side.getBoundingClientRect().right, sidebarShown: getComputedStyle(side).display !== 'none' };
      });
      assert.equal(found.rootImage, 'none', `${kind}: the slide root under the sidebar stays plain`);
      assert.equal(found.layers, 4, `${kind}: the content area carries the four frame bars`);
      if (found.sidebarShown) assert(found.contentLeft >= found.sidebarRight - 0.5, `${kind}: the frame starts right of the sidebar (${found.contentLeft} vs ${found.sidebarRight})`);
      parity++;
    }
    await context.close();
  }
  if (evidenceDir) await fs.writeFile(path.join(evidenceDir, 'pixel-evidence.json'), JSON.stringify({ evidence, images }, null, 2));
  console.log(`PASS patterns: ${count} divider renders, ${evidence.length} distinct-pixel comparisons, ${parity} artifact/preview pixel parity checks; seven bases at desktop/phone sizes.`);
} finally { await browser.close(); await server.close(); }
