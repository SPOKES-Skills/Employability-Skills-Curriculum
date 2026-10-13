#!/usr/bin/env node
import {otherStartingPaths} from './bespoke-test-navigation.mjs';
// Guided-mode checks use a fresh loopback-only server, synthetic people and in-memory drafts.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { browserType } from './bespoke-test-browser.mjs';
import { createDevServer } from './bespoke-dev-server.mjs';
import * as Model from '../bespoke/builder-model.mjs';
import { pixelDifference } from './bespoke-pixel-check.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const catalog = JSON.parse(await fs.readFile(path.join(root, 'bespoke/builder-catalog.json'), 'utf8'));
const axeSource = await fs.readFile(path.join(root, 'node_modules/axe-core/axe.min.js'), 'utf8');
const browser = await browserType.launch({ headless: true });
const failures = [], pageErrors = [], externalRequests = [];
let passed = 0;

async function scenario(name, callback) {
  if (process.env.BESPOKE_GUIDE_SCENARIO && !name.includes(process.env.BESPOKE_GUIDE_SCENARIO)) return;
  const server = await createDevServer({ port: 0 });
  const contexts = [];
  const makePage = async ({ mobile = false, wide = false, storageState } = {}) => {
    const viewport = mobile ? { width: 390, height: 844 } : wide ? { width: 1920, height: 1080 } : { width: 1440, height: 1000 };
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce', storageState });
    contexts.push(context);
    await context.addInitScript(() => { window.__bespokeAutosave = { enabled: false }; });
    await context.route(/^https?:/, (route) => {
      if (new URL(route.request().url()).origin === server.baseUrl) return route.continue();
      externalRequests.push(route.request().url());
      return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => pageErrors.push(`${name}: ${error.message}`));
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto(server.baseUrl + '/bespoke/');
    await page.locator('#stepList button').first().waitFor();
    await page.locator('#localPreviewNotice').waitFor({ state: 'visible' });
    return page;
  };
  try {
    await callback({ makePage });
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push({ name, message: error.stack || error.message });
    console.error(`FAIL ${name}: ${error.message}`);
  } finally {
    for (const context of contexts) await context.close();
    await server.close();
  }
}

const draft = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('bespoke-draft-v2')));
const design = async (page) => (await draft(page)).design;
const heading = (page) => page.locator('#stepPanel h1').first().innerText();
const count = (page) => page.locator('.guide-count').innerText();
async function startGuide(page) {
  await page.locator('#stage-start').click();await otherStartingPaths(page);
  await otherStartingPaths(page);await page.locator('#btnGuideMe').click();
  await page.locator('.guide-count').waitFor();
}
const next = (page) => page.locator('#btnGuideNext').click();
async function walkTo(page, title) {
  for (let i = 0; i < 60; i += 1) {
    if ((await heading(page)) === title) return;
    await next(page);
  }
  throw new Error(`Never reached "${title}"`);
}

try {
  await scenario('Start offers Guide me and the guide opens on the first question', async ({ makePage }) => {
    const page = await makePage();
    await page.locator('#stage-start').click();await otherStartingPaths(page);
    assert.equal(await page.locator('#btnGuideMe').innerText(), 'Guide me step by step');
    assert.equal(await page.locator('#btnBuildOwn').count(), 1, 'Edit freely (Build my own) is still there');
    await otherStartingPaths(page);await page.locator('#btnGuideMe').click();
    assert.match(await count(page), /^Question 1 of 40 · Starting look$/);
    assert.equal(await heading(page), 'Your team');
    assert.equal(await page.locator('#stage-slides').getAttribute('aria-current'), 'step');
  });

  await scenario('Next and Back move through questions and Exit returns to the free editor', async ({ makePage }) => {
    const page = await makePage();
    await startGuide(page);
    await next(page);
    assert.equal(await heading(page), 'Starting look');
    await next(page);
    assert.equal(await heading(page), 'Fonts');
    await page.locator('#btnGuideBack').click();
    assert.equal(await heading(page), 'Starting look');
    await page.locator('#btnGuideExit').click();
    assert.equal(await page.locator('#roleEditorPanel').count(), 1, 'the free editor is showing');
    await page.locator('#stage-start').click();await otherStartingPaths(page);
    assert.equal(await page.locator('#btnGuideContinue').innerText(), 'Continue guide');
    await otherStartingPaths(page);await page.locator('#btnGuideContinue').click();
    assert.equal(await heading(page), 'Starting look', 'Continue guide returns to the question the team left');
  });

  await scenario('the guide position survives a reload and a corrupt saved guide falls back', async ({ makePage }) => {
    const page = await makePage();
    await startGuide(page);
    await next(page);
    await next(page);
    await next(page);
    assert.equal(await heading(page), 'Background pattern');
    // With no design change the builder re-applies the shared state and opens on Lesson & team. The position is kept.
    await page.reload();
    await page.locator('#stepList button').first().waitFor();
    await page.locator('#stage-start').click();
    await otherStartingPaths(page);await page.locator('#btnGuideContinue').click();
    assert.equal(await heading(page), 'Background pattern', 'Continue guide returns to the question the team left');
    // After a real choice the draft is restored as it was, guide open.
    await page.locator('.guide-sample[aria-pressed="false"]').first().click();
    await page.reload();
    await page.locator('.guide-count').waitFor();
    assert.equal(await heading(page), 'Background pattern');
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('bespoke-draft-v2'));
      d.guide = { ids: 'garbage', index: 'x' };
      localStorage.setItem('bespoke-draft-v2', JSON.stringify(d));
    });
    await page.reload();
    await page.locator('#stepList button').first().waitFor();
    assert.equal(await page.locator('.guide-count').count(), 0, 'a corrupt guide is ignored');
    assert.equal(await page.locator('#stepPanel h1').count(), 1, 'the builder still opens');
  });
  await scenario('samples are real slide thumbnails and hovering previews without choosing', async ({ makePage }) => {
    const page = await makePage();
    await startGuide(page);
    await walkTo(page, 'Title layout');
    const samples = page.locator('.guide-sample');
    assert.equal(await samples.count(), 12);
    assert.equal(await samples.first().locator('.bespoke-slide').count(), 1, 'each sample draws a slide');
    const box = await samples.first().locator('.guide-thumb').boundingBox();
    assert.ok(box.height < box.width * 0.7, `a thumbnail is a 16:9 miniature, not a tall slab (${Math.round(box.width)} x ${Math.round(box.height)})`);
    assert.equal(await samples.first().locator('.guide-thumb').evaluate((t) => t.inert), true, 'thumbnails are inert');
    const before = await design(page);
    await page.mouse.move(0,0);
    const stage = await page.locator('#modelStage').innerHTML();
    const pick = before.slides.title.layout === 'split' ? 'center' : 'split';
    await page.locator(`.guide-sample[data-choice="${pick}"]`).hover();
    assert.notEqual(await page.locator('#modelStage').innerHTML(), stage, 'hovering previews the option');
    assert.deepEqual(await design(page), before, 'hovering does not save it');
    await page.mouse.move(0, 0);
    assert.equal(await page.locator('#modelStage').innerHTML(), stage, 'moving away restores the preview');
    await page.locator(`.guide-sample[data-choice="${pick}"]`).click();
    assert.equal((await design(page)).slides.title.layout, pick);
    assert.equal(await page.locator(`.guide-sample[data-choice="${pick}"]`).getAttribute('aria-pressed'), 'true');
  });

  await scenario('a color question shows four readable suggestions and More colors reveals the rest', async ({ makePage }) => {
    const page = await makePage();
    await startGuide(page);
    await walkTo(page, 'Title color');
    const shown = await page.locator('.guide-sample').evaluateAll((els) => els.map((e) => e.dataset.choice));
    assert.equal(shown[0], 'inherit');
    assert.ok(shown.length >= 5 && shown.length <= 6, `inherit plus four suggestions (and current), saw ${shown.length}`);
    await page.locator('#btnGuideMore').click();
    const all = await page.locator('.guide-sample').evaluateAll((els) => els.map((e) => e.dataset.choice));
    assert.equal(new Set(all.filter((id) => id !== 'inherit')).size, catalog.palette.length, 'all eleven colors are reachable');
    await page.locator('#btnGuideMore').click();
    assert.equal(await page.locator('.guide-sample').count(), shown.length, 'More colors toggles');
  });

  await scenario('a hard-to-read color is allowed and explained in plain words', async ({ makePage }) => {
    const page = await makePage();
    await startGuide(page);
    await walkTo(page, 'Heading color');
    await page.locator('#btnGuideMore').click();
    const risky = page.locator('.guide-sample .guide-note', { hasText: 'Hard to read' }).first();
    assert.ok(await risky.count(), 'some color is flagged hard to read');
    assert.match(await risky.innerText(), /^Hard to read \(\d\.\d to 1, aim for (3|4\.5) to 1\)$/);
    await risky.locator('xpath=ancestor::button').click();
    assert.deepEqual(Model.validateDesign(catalog, await design(page)), [], 'the design is still valid and saved');
    assert.equal(await page.locator('#readabilityNotes').isVisible(), true, 'the preview shows the advisory');
  });

  await scenario('shared-look questions name the slides a change leaves alone', async ({ makePage }) => {
    const page = await makePage();
    await startGuide(page);
    await walkTo(page, 'Background pattern');
    assert.ok(await page.locator('[data-shared-scope="pattern"]').count(), 'the shared-scope note is shown');
  });

  // Wide on purpose: at 1440 px the preview is too narrow to tell the Across and Balanced grid box layouts apart.
  await scenario('every guided sample changes the preview', async ({ makePage }) => {
    const page = await makePage({ wide: true });
    await startGuide(page);
    const dead = [];
    let questionsWithSamples = 0;
    const effective = (d) => JSON.stringify({ roles: d.roles, fonts: d.fonts, slides: d.slides, background: d.background, eff: Model.ROLE_STYLE_KINDS.map((k) => Model.effectiveRoleStyle(catalog, d, k)) });
    for (let guard = 0; guard < 60; guard += 1) {
      const title = await heading(page);
      if (await page.locator('.guide-sample').count()) {
        questionsWithSamples += 1;
        if (await page.locator('#btnGuideMore').count()) await page.locator('#btnGuideMore').click();
        const ids = await page.locator('.guide-sample').evaluateAll((els) => els.map((e) => e.dataset.choice));
        for (const id of ids) {
          const button = page.locator(`.guide-sample[data-choice="${id}"]`);
          if ((await button.getAttribute('aria-pressed')) === 'true') continue;
          await page.mouse.move(0, 0);
          const beforeDesign = await design(page);
          const before = await page.locator('#modelStage').screenshot();
          await button.click();
          if (await page.locator('#presetDialog[open]').count()) await page.locator('#presetApply').click();
          await page.mouse.move(0, 0);
          const after = await page.locator('#modelStage').screenshot();
          const afterDesign = await design(page);
          const moved = await pixelDifference(page, before, after).catch((error) => {
            if (/equal rendered dimensions/.test(error.message)) return { changedFraction: 1 };
            throw error;
          });
          // A faint change (a 6% watermark) stays under the per-pixel threshold, so require exactly no change at all.
          if (moved.changedFraction === 0 && moved.meanChannelDelta === 0 && effective(beforeDesign) !== effective(afterDesign)) dead.push(`${title}: ${id}`);
          if (await page.locator('#btnGuideMore').count() && (await page.locator('#btnGuideMore').getAttribute('aria-expanded')) !== 'true') await page.locator('#btnGuideMore').click();
        }
      }
      if (!(await page.locator('#btnGuideNext').count())) break;
      const last = /Finish/.test(await page.locator('#btnGuideNext').innerText());
      await next(page);
      if (last) break;
    }
    assert.deepEqual(dead, [], 'every option visibly changes the preview');
    assert.ok(questionsWithSamples >= 30, `swept ${questionsWithSamples} questions`);
  });
  await scenario('a recap lists the slide choices and Change jumps back to the question', async ({ makePage }) => {
    const page = await makePage();
    await startGuide(page);
    await walkTo(page, 'Your title slide');
    const lines = await page.locator('.guide-recap li').allInnerTexts();
    assert.ok(lines.length >= 5, `recap lists each title question, saw ${lines.length}`);
    assert.ok(lines.some((l) => /^Logo position:/.test(l)));
    await page.locator('.guide-recap li', { hasText: 'Logo position' }).getByRole('button', { name: /Change/ }).click();
    assert.equal(await heading(page), 'Logo position');
  });

  await scenario('the Text boxes recap edits the sample lines and the preview follows', async ({ makePage }) => {
    const page = await makePage();
    await startGuide(page);
    await walkTo(page, 'Your text boxes');
    await page.locator('#sample-box-0').fill('My first sample line');
    assert.match(await page.locator('#modelStage').innerText(), /My first sample line/);
    assert.equal((await design(page)).samples.boxes[0], 'My first sample line');
  });

  await scenario('Skip this slide type moves to the next section and keeps choices', async ({ makePage }) => {
    const page = await makePage();
    await startGuide(page);
    await walkTo(page, 'Title layout');
    const before = await design(page);
    await page.locator('#btnGuideSkip').click();
    assert.equal(await heading(page), 'Divider layout');
    assert.deepEqual(await design(page), before);
  });

  await scenario('teams can jump back to reached sections and not ahead', async ({ makePage }) => {
    const page = await makePage();
    await startGuide(page);
    await walkTo(page, 'Divider layout');
    assert.equal(await page.locator('.guide-section[data-section="title"]').isEnabled(), true);
    assert.equal(await page.locator('.guide-section[data-section="video"]').isDisabled(), true);
    await page.locator('.guide-section[data-section="title"]').click();
    assert.equal(await heading(page), 'Title layout');
  });

  await scenario('pressing Next through every question keeps the design and ends on Review', async ({ makePage }) => {
    const page = await makePage();
    await startGuide(page);
    const start = await design(page);
    for (let guard = 0; guard < 60 && (await page.locator('#btnGuideNext').count()); guard += 1) await next(page);
    assert.equal(await page.locator('#stage-review').getAttribute('aria-current'), 'step');
    assert.deepEqual(await design(page), start, 'Next without choosing changes nothing');
    assert.deepEqual(Model.validateDesign(catalog, await design(page)), []);
    await page.locator('#stage-start').click();await otherStartingPaths(page);
    assert.equal(await page.locator('#btnGuideMe').count(), 1, 'a finished guide offers to start again');
  });
  await scenario('Undo returns the guide to the question where the change was made', async ({ makePage }) => {
    const page = await makePage();
    await startGuide(page);
    await walkTo(page, 'Title layout');
    const original = (await design(page)).slides.title.layout;
    const pick = original === 'split' ? 'center' : 'split';
    await page.locator(`.guide-sample[data-choice="${pick}"]`).click();
    assert.equal((await design(page)).slides.title.layout, pick);
    await next(page);
    await next(page);
    assert.notEqual(await heading(page), 'Title layout');
    await page.locator('#btnUndo').click();
    assert.equal(await heading(page), 'Title layout', 'the guide is back on the question');
    assert.equal((await design(page)).slides.title.layout, original, 'the earlier value is back');
    await page.locator('#btnRedo').click();
    assert.equal((await design(page)).slides.title.layout, pick);
    assert.equal(await heading(page), 'Title layout');
  });

  await scenario('Undo after Start the guide again returns to the same question even though the team question is gone', async ({ makePage }) => {
    const page = await makePage();
    await startGuide(page);
    await page.locator('#teamName').fill('Pilot team');
    await page.locator('#spokespersonName').fill('Pat Teacher');
    await walkTo(page, 'Title layout');
    const original = (await design(page)).slides.title.layout;
    await page.locator(`.guide-sample[data-choice="${original === 'split' ? 'center' : 'split'}"]`).click();
    await page.locator('#btnGuideExit').click();
    await page.locator('#stage-start').click();await otherStartingPaths(page);
    await otherStartingPaths(page);await page.locator('#btnGuideRestart').click();
    await page.locator('.guide-count').waitFor();
    assert.match(await count(page), /of 39\b/, 'the restarted guide no longer asks the team question');
    await page.locator('#btnUndo').click();
    assert.equal(await heading(page), 'Title layout', 'Undo lands on the question where the change was made');
    assert.equal((await design(page)).slides.title.layout, original);
  });

  await scenario('sample thumbnails rescale when the window is resized', async ({ makePage }) => {
    const page = await makePage();
    await startGuide(page);
    await walkTo(page, 'Title layout');
    const fit = () => page.locator('.guide-thumb').first().evaluate((t) => {
      const scale = parseFloat(getComputedStyle(t).getPropertyValue('--s'));
      return { scale, expected: t.clientWidth / 720 };
    });
    await page.waitForFunction(() => document.querySelector('.guide-thumb')?.style.getPropertyValue('--s'));
    const wide = await fit();
    assert.ok(Math.abs(wide.scale - wide.expected) < 0.005, `fits at first: ${JSON.stringify(wide)}`);
    await page.setViewportSize({ width: 1000, height: 1000 });
    await page.waitForTimeout(300);
    const narrow = await fit();
    assert.notEqual(narrow.expected.toFixed(3), wide.expected.toFixed(3), 'the cell really changed width');
    assert.ok(Math.abs(narrow.scale - narrow.expected) < 0.005, `refits after the resize: ${JSON.stringify(narrow)}`);
  });

  await scenario('Undo after leaving the guide restores the design and does not reopen the guide', async ({ makePage }) => {
    const page = await makePage();
    await startGuide(page);
    await walkTo(page, 'Title layout');
    const original = (await design(page)).slides.title.layout;
    const pick = original === 'split' ? 'center' : 'split';
    await page.locator(`.guide-sample[data-choice="${pick}"]`).click();
    await page.locator('#btnGuideExit').click();
    await page.locator('#btnUndo').click();
    assert.equal((await design(page)).slides.title.layout, original);
    assert.equal(await page.locator('.guide-count').count(), 0, 'the guide stays closed');
    assert.equal(await page.locator('#roleEditorPanel').count(), 1);
  });

  await scenario('history from the free editor still works and old history entries load', async ({ makePage }) => {
    const page = await makePage();
    await page.locator('#stage-slides').click();
    await page.locator('#btnMoreOptions').click();
    await page.locator('#editor-title').click();
    await page.locator('#roleEditorPanel [data-choice][aria-pressed="false"]').first().click();
    const history = (await draft(page)).changes;
    assert.ok(history.length >= 1, 'the edit was recorded');
    assert.equal(history.at(-1).guide, undefined, 'edits outside the guide carry no guide position');
    await page.locator('#btnUndo').click();
    await page.reload();
    await page.locator('#stepList button').first().waitFor();
    assert.equal(await page.locator('#stepPanel h1').count(), 1);
  });
  const FORBIDDEN = /\b([Rr]oles?|[Hh]ex|[Cc][Ss][Ss]|[Rr][Gg][Bb][Aa]?|[Tt]oken|[Ss]cope|[Ii]nherit|[Gg]radient stop)\b|#[0-9a-f]{3,6}\b|[a-z][A-Z][a-z]/;
  async function axe(page, label) {
    await page.addScriptTag({ content: axeSource });
    const result = await page.evaluate(() => axe.run('#stepPanel', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] }, resultTypes: ['violations'] }));
    assert.deepEqual(result.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`), [], label);
  }

  await scenario('no guided screen shows design jargon or color codes', async ({ makePage }) => {
    const page = await makePage();
    await startGuide(page);
    const screens = [];
    for (let guard = 0; guard < 60 && (await page.locator('#btnGuideNext').count()); guard += 1) {
      if (await page.locator('#btnGuideMore').count()) await page.locator('#btnGuideMore').click();
      const text = await page.locator('#stepPanel').evaluate((panel) => {
        const clone = panel.cloneNode(true);
        clone.querySelectorAll('style, .start-team, .guide-scope, .guide-samples-text').forEach((n) => n.remove());
        // Join leaf elements one per line. innerText would fuse neighboring buttons into one word.
        return [...clone.querySelectorAll('*')].filter((n) => !n.children.length).map((n) => n.textContent.trim()).filter(Boolean).join('\n');
      });
      screens.push(`${await heading(page)}\n${text}`);
      await next(page);
    }
    assert.ok(screens.length >= 39);
    for (const text of screens) assert.doesNotMatch(text, FORBIDDEN, text.slice(0, 60));
  });

  await scenario('guided screens pass the accessibility checks', async ({ makePage }) => {
    const page = await makePage();
    await startGuide(page);
    for (const title of ['Your team', 'Fonts', 'Title layout', 'Title color', 'Your title slide', 'Box layout', 'Your text boxes', 'Video layout', 'Activity layout']) {
      await walkTo(page, title);
      await axe(page, `guide screen "${title}"`);
    }
  });

  await scenario('the guide fits and stays reachable on a phone', async ({ makePage }) => {
    const page = await makePage({ mobile: true });
    await startGuide(page);
    for (const title of ['Fonts', 'Title layout', 'Title color']) {
      await walkTo(page, title);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(overflow <= 1, `no sideways scroll on "${title}", saw ${overflow}`);
      await page.locator('#btnGuideNext').scrollIntoViewIfNeeded();
      assert.equal(await page.locator('#btnGuideNext').isVisible(), true);
    }
    await page.locator('#surface-preview').click();
    assert.equal(await page.locator('#modelStage .bespoke-slide').count(), 1, 'the preview is one tap away');
  });

  await scenario('keyboard users can operate the guide', async ({ makePage }) => {
    const page = await makePage();
    await startGuide(page);
    await walkTo(page, 'Title layout');
    const before = (await design(page)).slides.title.layout;
    const pick = before === 'split' ? 'center' : 'split';
    await page.locator(`.guide-sample[data-choice="${pick}"]`).focus();
    await page.keyboard.press('Enter');
    assert.equal((await design(page)).slides.title.layout, pick);
    assert.equal(await page.evaluate(() => document.activeElement?.id), `guide-choice-${pick}`, 'focus stays on the chosen sample after the screen redraws');
    await page.locator('#btnGuideNext').focus();
    await page.keyboard.press('Enter');
    assert.equal(await heading(page), 'Logo position');
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'btnGuideNext', 'focus stays on Next so the keyboard flow continues');
    await page.waitForFunction(() => /Question \d+ of \d+: Logo position/.test(document.getElementById('liveRegion').textContent));
    await walkTo(page, 'Box layout');
    await page.locator('.guide-sample').first().focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.closest('.guide-thumb') === null && document.activeElement.matches('.guide-sample, #btnGuideBack, #btnGuideNext, #btnGuideSkip, #btnGuideExit')), true, 'Tab goes to the next control, never into a thumbnail');
  });

  await scenario('the team question fills in, saves, can be returned to, and a draft left there reopens', async ({ makePage }) => {
    const page = await makePage();
    await startGuide(page);
    assert.ok((await page.locator('#lessonSelect option').count()) >= 6, 'the lesson list is filled in');
    await page.locator('#teamName').fill('Pilot team');
    await page.locator('#spokespersonName').fill('Pat Teacher');
    assert.equal((await draft(page)).teamName, 'Pilot team', 'typed names are saved');
    await next(page);
    await next(page);
    assert.equal(await heading(page), 'Fonts');
    await page.locator('.guide-sample[aria-pressed="false"]').first().click();
    await page.locator('#btnGuideBack').click();
    await page.locator('#btnGuideBack').click();
    assert.equal(await heading(page), 'Your team', 'Back reaches the team question');
    assert.equal(await page.locator('#teamName').inputValue(), 'Pilot team');
    await page.reload();
    await page.locator('#stepList button').first().waitFor();
    await page.locator('.guide-count').waitFor();
    assert.equal(await heading(page), 'Your team', 'a draft left on the team question reopens');
  });

  await scenario('jumping or leaving puts keyboard focus somewhere sensible', async ({ makePage }) => {
    const page = await makePage();
    await startGuide(page);
    await walkTo(page, 'Your title slide');
    await page.locator('.guide-recap li', { hasText: 'Logo position' }).getByRole('button', { name: /Change/ }).click();
    assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'H1', 'after Change, focus is on the new question');
    await page.locator('#btnGuideExit').click();
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'editor-title', 'after Exit, focus is on the editor tab');
  });

  await scenario('moving focus across samples does not repeat a preview announcement', async ({ makePage }) => {
    const page = await makePage();
    await startGuide(page);
    await walkTo(page, 'Title layout');
    await page.waitForTimeout(200);
    await page.evaluate(() => { document.getElementById('liveRegion').textContent = ''; });
    await page.locator('.guide-sample').first().focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.getElementById('liveRegion').textContent), '', 'previewing by focus stays silent');
  });
} finally {
  await browser.close();
}

if (!passed && !failures.length) failures.push({ name: 'scenario selection', message: 'No guided scenario matched the requested filter.' });
if (pageErrors.length) failures.push({ name: 'runtime errors', message: JSON.stringify(pageErrors) });
if (externalRequests.length) failures.push({ name: 'unexpected external requests', message: JSON.stringify(externalRequests) });
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  console.error(`BeSpoke guided browser: ${passed} scenarios passed, ${failures.length} failed.`);
  process.exitCode = 1;
} else console.log(`BeSpoke guided browser: ${passed} scenarios passed; no runtime errors or external requests.`);
