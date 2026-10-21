#!/usr/bin/env node
// Browser checks for the showcase polish: stage names, plain words, and the chrome rules later cases extend.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDevServer, LOCAL_PREVIEW_VIEW_CODE} from './bespoke-dev-server.mjs';
import {defaultDesign} from '../bespoke/builder-model.mjs';
import catalog from '../bespoke/builder-catalog.json' with {type: 'json'};
import {browserType} from './bespoke-test-browser.mjs';
import {clickMenuItem} from './bespoke-test-navigation.mjs';

const server = await createDevServer({port: 0});
const browser = await browserType.launch({headless: true});
const errors = [];
const open = async (width, height = 900, reducedMotion = 'reduce', baseUrl = server.baseUrl) => {
  const context = await browser.newContext({viewport: {width, height}, reducedMotion});
  await context.addInitScript(() => { window.__bespokeAutosave = {enabled: false}; });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(baseUrl + '/bespoke/');
  await page.locator('#localPreviewNotice').waitFor({state: 'visible'});
  return {context, page};
};
const rect = (page, selector) => page.locator(selector).first().evaluate(el => {
  const r = el.getBoundingClientRect();
  return {left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height};
});
const pass = name => console.log('ok - ' + name);
// Text of an element without the buttons it holds (the Swap and Change only this slide links).
const ownText = (page, selector) => page.locator(selector).evaluate(el => {
  const copy = el.cloneNode(true);
  copy.querySelectorAll('button').forEach(button => button.remove());
  return copy.textContent.replace(/\s+/g, ' ').trim();
});
// A hidden element has an empty box and cannot overlap anything.
const overlaps = (a, b) => a.width > 0 && a.height > 0 && b.width > 0 && b.height > 0
  && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
// Pick a look, apply one, and land on Make it yours.
const makeItOurs = async (page, look) => {
  await page.locator('#stage-start').click();
  await page.locator('#preset-' + look).click();
  await page.locator('#btnMakeItOurs').click();
  await page.locator('#workspace[data-stage=slides]').waitFor();
};
const chooseColor = async (page, name) => {
  await page.locator('#context-color-well').click();
  await page.locator('#context-color-popover').getByRole('radio', {name, exact: true}).click();
};
// The browser draft holds the design with its sample words; the recovery copy beside it can hold an older one.
const savedDraft = page => page.evaluate(() => JSON.parse(localStorage.getItem('bespoke-draft-v2')));
const lookNameOf = id => catalog.presets.find(preset => preset.id === id).colorLabel;
const textOf = (page, selector) => page.locator(selector).textContent().then(t => t.replace(/\s+/g, ' ').trim());
// Slide renders carry their own data-look (the text box style), so look cards are read from the strip itself.
const visibleLooks = page => page.locator('#lookStrip > [data-look]').evaluateAll(list => list
  .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; })
  .map(el => el.dataset.look));

// Visible builder controls outside the slide renders and outside shadow roots.
// Later cases use this to check the 44px target, focus ring and tab order rules.
const chromeControls = page => page.evaluate(() => {
  const selector = 'button, select, input, summary, [role=radio], [role=tab]';
  const visible = el => {
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  };
  return [...document.querySelectorAll(selector)]
    .filter(el => !el.closest('.bespoke-slide') && visible(el))
    .map(el => {
      const r = el.getBoundingClientRect();
      return {
        id: el.id, tag: el.tagName.toLowerCase(), role: el.getAttribute('role'),
        label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 60),
        left: r.left, top: r.top, width: r.width, height: r.height
      };
    });
});

try {
  {
    const {context, page} = await open(1440, 900);
    const pills = await page.locator('#stepList button').allTextContents();
    for (const [id, name] of [['team', 'Lesson & team'], ['start', 'Pick a look'], ['slides', 'Make it yours'], ['review', 'Send']]) {
      const text = await page.locator('#stage-' + id).textContent();
      assert.ok(text.includes(name), `#stage-${id} reads ${name}, got "${text}" (pills: ${pills.join(' | ')})`);
    }
    await context.close();
    pass('stage pills use the new names');
  }
  {
    const {context, page} = await open(1440, 900);
    await clickMenuItem(page, '#btnHelp');
    const help = await page.locator('#builderHelp').textContent();
    for (const name of ['Lesson & team', 'Pick a look', 'Make it yours', 'Send'])
      assert.ok(help.includes(name), `How it works names ${name}`);
    const items = await page.locator('#builderHelpContent .how-to-steps > li').evaluateAll(list => list.map(li => li.querySelector('strong').textContent.trim().replace(/\.$/, '')));
    assert.deepEqual(items, ['Lesson & team', 'Pick a look', 'Make it yours', 'Send'], 'How it works has one item per stage, in order');
    for (const gone of ['Open Lesson & team when needed', 'editor sidebar', 'Files & recovery', 'Color & layout', 'Review & save'])
      assert.ok(!help.includes(gone), `How it works no longer says "${gone}"`);
    await context.close();
    pass('How it works matches the four stages');
  }
  {
    const {context, page} = await open(1440, 900);
    const heights = await page.locator('#stepList button').evaluateAll(list => list.map(b => b.getBoundingClientRect().height));
    assert.equal(heights.length, 4);
    for (const height of heights) assert.ok(height >= 44, `stage pill is at least 44px tall, got ${height}px`);
    await context.close();
    pass('stage pills are tall enough');
  }
  {
    const {context, page} = await open(1440, 900);
    await page.locator('#stage-slides').click();
    await page.locator('#modelStage .slide-title-text').click();
    const labels = await page.locator('#contextToolbar').evaluate(toolbar => [...toolbar.querySelectorAll('.toolbar-label, label.toolbar-field')]
      .map(el => (el.matches('label') ? el.firstChild.textContent : el.textContent).trim()));
    assert.ok(labels.includes('Editing'), `toolbar says Editing, got ${labels.join(' | ')}`);
    assert.ok(labels.includes('Position'), `toolbar says Position, got ${labels.join(' | ')}`);
    for (const gone of ['Selected element', 'Place in text area'])
      assert.ok(!labels.includes(gone), `toolbar no longer says ${gone}`);
    const named = await chromeControls(page);
    assert.ok(named.length > 0, 'chromeControls finds the builder controls');
    assert.ok(named.every(c => !c.label.includes('Selected element') && !c.label.includes('Place in text area')), 'no control keeps an old label');
    await context.close();
    pass('toolbar words are plain');
  }
  {
    const {context, page} = await open(1440, 900);
    await page.locator('#stage-slides').click();
    const text = id => page.locator('#stage-' + id).textContent().then(t => t.replace(/\s+/g, ' ').trim());
    assert.equal(await text('team'), '\u2713 Lesson & team', 'a passed stage shows a check in place of its number');
    assert.equal(await text('start'), '\u2713 Pick a look');
    assert.equal(await text('slides'), '3 \u00b7 Make it yours');
    assert.equal(await text('review'), '4 \u00b7 Send');
    assert.equal(await page.locator('#stage-start').getAttribute('aria-label'), 'Stage 2 of 4: Pick a look, completed');
    assert.equal(await page.locator('#stage-slides').getAttribute('aria-label'), 'Stage 3 of 4: Make it yours');
    assert.equal(await page.locator('#stage-review').getAttribute('aria-label'), 'Stage 4 of 4: Send');
    assert.match(await page.locator('#stage-team').getAttribute('aria-label'), /^Stage 1 of 4: Lesson & team, completed/);
    await page.locator('#stage-start').click();
    assert.equal(await text('start'), '2 \u00b7 Pick a look', 'the current stage is numbered, not checked');
    assert.equal(await text('slides'), '3 \u00b7 Make it yours');
    assert.equal(await page.locator('#stage-team .step-num').isVisible(), true, 'the number or check shows on wide windows');
    await context.close();
    pass('stage pills show a number and name, with a check on passed stages');
  }
  {
    const {context, page} = await open(1440, 900);
    await page.locator('#stage-slides').click();
    await page.locator('#modelStage .slide-title-text').click();
    // The role editor in the Slide options drawer is where the inherit-from-layout choices live.
    if (!await page.locator('#roleEditorTabs').isVisible()) await page.locator('#btnMoreOptions').click();
    for (const field of ['headingSize', 'bodySize', 'headingAlignment', 'bodyAlignment']) {
      const options = await page.locator(`#role-title-${field} option`).allTextContents();
      assert.ok(options.includes('Default'), `${field} offers Default, got ${options.join(' | ')}`);
      assert.ok(!options.includes('Match arrangement'), `${field} no longer offers Match arrangement`);
    }
    await page.locator('#stage-review').click();
    const rows = await page.locator('#effectiveDesignSummary .review-role').evaluateAll(list => list.map(row => ({
      labels: [...row.querySelectorAll('dt')].map(dt => dt.textContent),
      detail: row.querySelector('p.helper').textContent
    })));
    const solid = rows.filter(r => r.detail.startsWith('Solid background'));
    assert.ok(solid.length > 0, 'at least one slide type has a solid background');
    for (const row of solid) {
      assert.ok(row.labels.includes('Second color (not used by this layout)'), `solid row says Second color, got ${row.labels.join(' | ')}`);
      assert.ok(!row.labels.some(l => l.includes('kept for two colors')), 'the old wording is gone');
    }
    for (const row of rows.filter(r => !r.detail.startsWith('Solid background')))
      assert.ok(row.labels.includes('Second background'), 'a gradient row keeps Second background');
    assert.ok(!(await page.locator('#effectiveDesignSummary').textContent()).includes('Match arrangement'), 'the review no longer says Match arrangement');
    await context.close();
    pass('Default and Second color words show where they are used');
  }
  {
    // A host that is not localhost renders the shared-save wording; the local preview renders "Save test design".
    const context = await browser.newContext({viewport: {width: 1440, height: 900}, reducedMotion: 'reduce'});
    await context.route('http://bespoke.example.test/**', async route => {
      const url = new URL(route.request().url());
      // The dev server only answers its own origin, so forward the request without the browser's Origin.
      const {origin, referer, ...headers} = route.request().headers();
      await route.fulfill({response: await route.fetch({url: server.baseUrl + url.pathname + url.search, headers})});
    });
    await context.addInitScript(() => { window.__bespokeAutosave = {enabled: false}; });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://bespoke.example.test/bespoke/');
    await page.locator('#stage-team').waitFor();
    assert.equal(await page.locator('#localPreviewNotice').isVisible(), false, 'this host is not the local preview');
    assert.equal((await page.locator('#btnSave').textContent()).trim(), 'Save for the team');
    await page.locator('#stage-review').click();
    assert.equal(await page.getByRole('button', {name: 'Save for the team', exact: true}).count() >= 2, true, 'the review panel offers Save for the team as well');
    assert.equal(await page.getByRole('button', {name: 'Save shared design'}).count(), 0, 'the old save wording is gone');
    await context.close();
    pass('the save button says Save for the team');
  }
  {
    const guide = readFileSync(new URL('../bespoke/team-guide.html', import.meta.url), 'utf8');
    for (const name of ['Lesson &amp; team', 'Pick a look', 'Make it yours', 'Send'])
      assert.ok(guide.includes(`<strong>${name}.</strong>`), `team-guide names ${name}`);
    for (const gone of ['Color &amp; layout', 'Color & layout', 'Customize', 'Review &amp; save', 'Review & save', 'Save shared design'])
      assert.ok(!guide.includes(gone), `team-guide no longer says ${gone}`);
    pass('the team guide uses the new stage names');
  }
  {
    const {context, page} = await open(1440, 900);
    await page.locator('#stage-slides').click();
    await page.evaluate(() => window.scrollTo(0, 600));
    // The live region is in the page and rendered before any message, so screen readers register it.
    const toast = page.locator('#toast');
    const state = () => toast.evaluate(el => ({
      display: getComputedStyle(el).display, visibility: getComputedStyle(el).visibility,
      opacity: getComputedStyle(el).opacity, position: getComputedStyle(el).position,
      text: el.textContent, hiddenAttr: el.hasAttribute('hidden')
    }));
    assert.equal(await page.locator('#toast').count(), 1, 'one #toast element is reused');
    assert.equal(await toast.getAttribute('role'), 'status');
    assert.equal(await toast.getAttribute('aria-live'), 'polite');
    const idle = await state();
    assert.notEqual(idle.display, 'none', 'the idle toast is rendered, not display:none');
    assert.equal(idle.hiddenAttr, false, 'the idle toast has no hidden attribute');
    assert.notEqual(idle.visibility, 'hidden', 'the idle toast is not visibility:hidden');
    assert.equal(idle.opacity, '0', 'the idle toast is visually hidden');
    assert.equal(idle.text, '', 'the idle toast is empty');
    assert.match(await toast.ariaSnapshot(), /^- status/, 'the live region is in the accessibility tree before the message');
    await page.locator('#btnSave').click();
    await toast.filter({hasText: /Local test design saved|already up to date/}).waitFor({timeout: 4000});
    const shown = await state();
    assert.equal(shown.opacity, '1', 'the toast is visible with its message');
    assert.equal(shown.position, 'fixed', 'the toast is fixed to the viewport');
    assert.equal(await page.locator('#toast').count(), 1, 'still one #toast element');
    const box = await rect(page, '#toast');
    assert.ok(box.top >= 0 && box.top <= 120, `toast sits near the top of the viewport, top is ${box.top}px`);
    assert.equal(await page.locator('#fileStatus').isVisible(), false, 'the page-top strip stays hidden for a success message');
    await page.waitForTimeout(5000);
    const after = await state();
    assert.equal(after.opacity, '0', 'the toast hides itself after a few seconds');
    assert.equal(after.text, '', 'the hidden toast is emptied');
    assert.notEqual(after.display, 'none', 'the region stays rendered after it hides');
    await context.close();
    pass('success messages are toasts');
  }
  {
    const {context, page} = await open(1440, 900);
    await page.locator('#stage-start').click();
    const changes = () => page.locator('#changeList li').count();
    const n = await changes();
    const before = await textOf(page, '#lookName');
    await page.locator('#preset-horizon').hover();
    assert.equal(await textOf(page, '#lookName'), 'Ocean blue', 'hover shows the look name beside the stage');
    assert.equal(await textOf(page, '#lookStageHeading'), 'Previewing Ocean blue');
    assert.equal(await changes(), n, 'a preview is not an undo step');
    await page.keyboard.press('Escape');
    assert.equal(await textOf(page, '#lookName'), before, 'Escape returns to the applied look');
    await context.close();
    pass('hover previews without an undo step');
  }
  {
    const {context, page} = await open(1440, 900);
    await page.locator('#stage-start').click();
    await page.locator('#preset-fun').click();
    await page.locator('#preset-horizon').hover();
    assert.equal(await textOf(page, '#lookName'), 'Ocean blue', 'hover previews after a click-apply');
    await page.locator('#lookStage').hover();
    assert.equal(await textOf(page, '#lookStageHeading'), 'Your starting look', 'leaving the strip ends the preview');
    assert.equal(await textOf(page, '#lookName'), 'Midnight & gold', 'leaving the strip shows the applied look');
    await context.close();
    pass('leaving the strip returns to the applied look');
  }
  {
    const {context, page} = await open(1440, 900);
    await page.locator('#stage-start').click();
    const before = (await savedDraft(page)).design;
    await page.locator('#preset-fun').click();
    assert.equal(await page.locator('#presetDialog').count(), 0, 'no confirmation dialog');
    assert.equal(await page.locator('#workspace').getAttribute('data-stage'), 'start', 'applying stays on Pick a look');
    assert.equal(await textOf(page, '#lookName'), 'Midnight & gold');
    assert.notDeepEqual((await savedDraft(page)).design, before, 'the look was applied');
    assert.equal(await textOf(page, '#btnUndoLook'), 'Undo');
    await page.locator('#btnUndoLook').click();
    assert.deepEqual((await savedDraft(page)).design, before, 'Undo restores the earlier design');
    await context.close();
    pass('clicking applies without a dialog and stays');
  }
  {
    // Pick a look fits a 1440x900 window without scrolling, so a short window makes the page really scroll.
    const {context, page} = await open(1440, 400);
    await page.locator('#stage-start').click();
    await page.locator('#preset-fun').click();
    await page.evaluate(() => window.scrollTo(0, 400));
    const scrolled = () => page.evaluate(() => ({page: window.scrollY, workspace: document.getElementById('workspace').scrollTop}));
    assert.ok((await scrolled()).page > 0, 'the page scrolled down before Make it ours');
    assert.equal(await textOf(page, '#btnMakeItOurs'), 'Make it ours →');
    await page.locator('#btnMakeItOurs').click();
    assert.equal(await page.locator('#workspace').getAttribute('data-stage'), 'slides');
    assert.deepEqual(await scrolled(), {page: 0, workspace: 0}, 'Make it yours opens at the top');
    await context.close();
    pass('Make it ours lands at the top');
  }
  {
    const {context, page} = await open(1440, 900);
    await page.locator('#stage-start').click();
    const titles = await page.locator('#showcase .slide-title-text').allTextContents();
    assert.ok(titles.length > 1, `the stage and the strip render title slides, got ${titles.length}`);
    for (const title of titles) assert.equal(title.trim(), 'Money Management', 'every render carries the lesson name');
    assert.equal((await savedDraft(page)).design.samples.title, defaultDesign(catalog).samples.title, 'the lesson name is not written into the design');
    await context.close();
    pass('slides show the lesson name');
  }
  {
    const {context, page} = await open(1440, 900);
    await page.locator('#stage-start').click();
    const chips = await page.locator('[data-mood]').evaluateAll(list => list.map(el => el.dataset.mood));
    assert.deepEqual(chips, ['all', 'calm', 'bold', 'bright', 'classic'], 'mood chips in order');
    assert.equal((await visibleLooks(page)).length, 12, 'All 12 shows every look');
    await page.locator('[data-mood="bold"]').click();
    assert.deepEqual((await visibleLooks(page)).sort(), ['fun', 'outspoken']);
    await context.close();
    pass('moods filter the strip');
  }
  {
    const {context, page} = await open(1440, 900);
    await page.locator('#stage-start').click();
    assert.equal(await page.locator('#lookStrip').getAttribute('role'), 'listbox');
    const ids = await visibleLooks(page);
    const next = ids[ids.indexOf('professional') + 1];
    await page.locator('#preset-professional').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.look), next, 'ArrowRight moves to the next look');
    assert.equal(await textOf(page, '#lookName'), lookNameOf(next), 'focus previews the look');
    await context.close();
    pass('arrow keys move and preview');
  }
  {
    // A server with nothing saved, so the team arrives without a design of their own.
    const empty = await createDevServer({port: 0});
    const {context, page} = await open(1440, 900, 'reduce', empty.baseUrl);
    await page.locator('#stage-start').click();
    assert.equal(await page.locator('#lookYours').count(), 0, 'no Your design card without a design of their own');
    await page.locator('#preset-fun').click();
    await page.locator('#btnMakeItOurs').click();
    await page.locator('#modelStage .slide-title-text').click();
    await page.locator('#context-color-well').click();
    await page.locator('#context-color-popover [role=radio][aria-checked=false]').first().click();
    const mine = (await savedDraft(page)).design;
    await page.locator('#stage-start').click();
    assert.ok(await page.locator('#lookYours').isVisible(), 'Your design card shows');
    await page.locator('#preset-horizon').click();
    assert.notDeepEqual((await savedDraft(page)).design, mine);
    await page.locator('#lookYours').click();
    assert.deepEqual((await savedDraft(page)).design, mine, 'Your design restores the design from Make it yours');
    await context.close();
    await empty.close?.();
    pass('Your design card');
  }
  {
    const {context, page} = await open(1024, 768);
    await page.locator('#stage-start').click();
    const stage = await rect(page, '#lookStage'), side = await rect(page, '#lookSide');
    assert.ok(side.top >= stage.bottom, `the side column moves under the stage, side top ${side.top}, stage bottom ${stage.bottom}`);
    // The strip sits under the side column here, so a preview must not change the side column's height.
    const stripTop = () => page.locator('#lookStrip').evaluate(el => el.getBoundingClientRect().top + window.scrollY);
    const before = await stripTop();
    for (const id of ['outspoken', 'columns', 'masthead']) {
      await page.locator('#preset-' + id).hover();
      assert.equal(await stripTop(), before, `previewing ${id} leaves the strip in place`);
    }
    await context.close();
    pass('side column wraps at 1024');
  }
  {
    const context = await browser.newContext({viewport: {width: 1440, height: 900}, reducedMotion: 'reduce'});
    await context.addInitScript(() => { window.__bespokeAutosave = {enabled: false}; });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${server.baseUrl}/bespoke/#view=money-management.${LOCAL_PREVIEW_VIEW_CODE}`);
    await page.locator('body[data-access=view]').waitFor();
    await page.locator('#stage-start').click();
    await page.locator('#lookStrip').waitFor();
    const locked = selector => page.locator(selector).evaluateAll(list => list.map(el => ({id: el.id || el.dataset.look, off: el.disabled === true || el.getAttribute('aria-disabled') === 'true'})));
    const controls = [...await locked('#btnMakeItOurs'), ...await locked('#btnBuildOwn'), ...await locked('#lookYours'), ...await locked('#lookStrip > [data-look]')];
    assert.ok(controls.length >= 14, `found the look controls, got ${controls.length}`);
    for (const control of controls) assert.ok(control.off, `${control.id} cannot apply in a view-only session`);
    await page.locator('#preset-horizon').hover();
    assert.equal(await textOf(page, '#lookName'), 'Ocean blue', 'hover still previews');
    await context.close();
    pass('view-only sessions cannot apply');
  }
  {
    const {context, page} = await open(1440, 900);
    await page.locator('#stage-team').click();
    const longest = await page.locator('#lessonSelect option').evaluateAll(list => list.reduce((a, b) => (b.textContent.length > a.textContent.length ? b : a)).value);
    await page.locator('#lessonSelect').selectOption(longest);
    await page.locator('#stage-start').click();
    const fits = await page.locator('#showcase .slide-title-text').evaluateAll(list => list.map(el => {
      const r = el.getBoundingClientRect(), s = el.closest('.bespoke-slide').getBoundingClientRect();
      return {text: el.textContent, wide: el.scrollWidth <= el.clientWidth + 1, inside: r.left >= s.left - 1 && r.right <= s.right + 1 && r.top >= s.top - 1 && r.bottom <= s.bottom + 1};
    }));
    assert.ok(fits.length > 1);
    for (const fit of fits) {
      assert.ok(fit.wide, `"${fit.text}" does not overflow its line`);
      assert.ok(fit.inside, `"${fit.text}" stays inside its slide`);
    }
    await context.close();
    pass('long lesson titles fit');
  }
  {
    const {context, page} = await open(390, 844);
    await page.locator('#stage-start').click();
    await page.locator('#btnMakeItOurs').scrollIntoViewIfNeeded();
    assert.ok(await page.locator('#btnMakeItOurs').isVisible(), 'Make it ours is reachable on a phone');
    await page.locator('#preset-modern').click();
    assert.equal(await textOf(page, '#lookName'), 'Fresh green', 'a tap applies the look on a phone');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth) <= 390, 'no sideways page scroll on a phone');
    await context.close();
    pass('phone width stacks');
  }
  {
    for (const [width, height] of [[1440, 900], [1280, 800], [1024, 768]]) {
      const {context, page} = await open(width, height);
      await page.locator('#stage-slides').click();
      for (const drawer of ['closed', 'open']) {
        for (const [view, target] of [['title', '#modelStage .slide-title-text'], ['cards', '#modelStage .slide-card .slide-body']]) {
          await page.locator(`#previewTabs [data-view=${view}]`).click();
          await page.locator(target).first().click();
          if (drawer === 'open' && await page.locator('#workspace').getAttribute('data-options') !== 'true') await page.locator('#btnMoreOptions').click();
          const where = `${width}x${height}, drawer ${drawer}, ${view}`;
          const toolbar = await rect(page, '#contextToolbar'), slide = await rect(page, '#modelStage .bespoke-slide');
          assert.ok(toolbar.height > 0, `${where}: the toolbar shows`);
          assert.ok(toolbar.bottom <= slide.top, `${where}: toolbar bottom ${toolbar.bottom} is above slide top ${slide.top}`);
          assert.ok(toolbar.bottom <= await page.evaluate(() => innerHeight), `${where}: toolbar ends inside the window, bottom ${toolbar.bottom}`);
          for (const other of ['#btnPresent', '#btnTryVersion', '.similarity'])
            assert.ok(!overlaps(toolbar, await rect(page, other)), `${where}: toolbar does not cover ${other}`);
        }
      }
      await context.close();
    }
    pass('toolbar stays above the slide and on screen');
  }
  {
    const {context, page} = await open(1440, 900);
    await page.locator('#stage-slides').click();
    await page.locator('#modelStage .slide-title-text').click();
    assert.ok(await page.locator('#contextToolbar #context-font').isVisible(), 'Font is in the toolbar for a text selection');
    const labels = await page.locator('#contextToolbar').evaluate(toolbar => [...toolbar.querySelectorAll('.toolbar-label, label.toolbar-field, label.toolbar-copy')]
      .map(el => (el.matches('label') ? el.firstChild.textContent : el.textContent).trim()));
    assert.deepEqual(labels, ['Editing', 'Sample text', 'Font', 'Size', 'Text color', 'Align', 'Position'], 'text fields in the spec order');
    await page.locator('#selectedElement').focus();
    const stops = [];
    while (await page.evaluate(() => document.getElementById('contextToolbar').contains(document.activeElement))) {
      stops.push(await page.evaluate(() => { const r = document.activeElement.getBoundingClientRect(); return {id: document.activeElement.id, left: r.left, right: r.right, top: r.top, bottom: r.bottom}; }));
      await page.keyboard.press('Tab');
    }
    assert.ok(stops.length >= 7, `Tab visits the toolbar fields, got ${stops.map(s => s.id).join(', ')}`);
    for (let i = 1; i < stops.length; i++) {
      const [a, b] = [stops[i - 1], stops[i]];
      const sameRow = b.top < a.bottom && a.top < b.bottom;
      assert.ok(sameRow ? b.left >= a.right - 1 : b.top >= a.bottom - 1, `${b.id} comes after ${a.id} left to right, then top to bottom`);
    }
    await context.close();
    pass('font is in the toolbar');
  }
  {
    const {context, page} = await open(1440, 900);
    await page.locator('#stage-slides').click();
    await page.locator('#modelStage .slide-title-text').click();
    await page.locator('#context-color-well').click();
    const names = await page.locator('#context-color-popover .swatch').evaluateAll(list => list.map(el => el.innerText.trim()));
    assert.deepEqual(names, catalog.palette.map(color => color.name), 'each swatch shows its palette name');
    await context.close();
    pass('swatches carry names');
  }
  {
    const {context, page} = await open(1440, 900);
    await makeItOurs(page, 'professional');
    await page.locator('#modelStage .slide-title-text').click();
    await chooseColor(page, 'Gold');
    assert.equal(await ownText(page, '#scopeLine'), 'Gold also changes the Divider heading, because they share a color.');
    assert.equal(await textOf(page, '#btnOnlyThisSlide'), 'Change only this slide…');
    assert.ok(await page.locator('[data-rail-kind="divider"] .changed-tag').isVisible(), 'the Divider thumbnail is tagged');
    assert.equal(await textOf(page, '[data-rail-kind="divider"] .changed-tag'), 'changed');
    assert.equal(await page.locator('[data-rail-kind="title"] .changed-tag').count(), 0, 'the slide being edited is not tagged');
    assert.equal(await ownText(page, '#startingFrom'), 'Starting from Paper & berry · 2 changes');
    await page.locator('#previewTabs [data-view=divider]').click();
    assert.equal(await page.locator('#modelStage .slide-heading').first().evaluate(el => getComputedStyle(el).color), 'rgb(211, 178, 87)');
    await page.locator('#stage-review').click();
    await page.locator('#stage-slides').click();
    assert.equal(await page.locator('.changed-tag').count(), 0, 'leaving the stage clears the tags');
    await context.close();
    pass('scope line names the divider');
  }
  {
    const {context, page} = await open(1440, 900);
    await makeItOurs(page, 'professional');
    await page.locator('#modelStage .slide-title-text').click();
    await chooseColor(page, 'Gold');
    await page.locator('#btnOnlyThisSlide').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'context-only-slide', 'focus lands on the Only this slide switch');
    assert.ok(await page.locator('#context-only-slide').isVisible(), 'the drawer is open at the switch');
    await page.locator('#context-only-slide').check();
    assert.equal(await ownText(page, '#scopeLine'), 'This color stays on the Title slide only.');
    await context.close();
    pass('only this slide line');
  }
  {
    const {context, page} = await open(1440, 900);
    await page.locator('#stage-slides').click();
    await page.locator('#modelStage .slide-title-text').click();
    await page.locator('#btnMoreOptions').click();
    assert.equal(await page.locator('#chromeRail').isVisible(), true, 'the drawer is open');
    const closers = await page.locator('#chromeRail button').evaluateAll(list => list
      .filter(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && /hide|close/i.test(el.textContent); })
      .map(el => el.id));
    assert.deepEqual(closers, ['btnHideDrawer'], 'one close button in the drawer');
    assert.equal(await page.locator('#btnCloseOptions').count(), 0, 'Close options is gone');
    assert.equal(await page.locator('#stepCount').isVisible(), false, 'no stage counter in the drawer');
    assert.equal(await page.locator('.similarity').isVisible(), false, 'the similarity meter leaves Make it yours');
    await context.close();
    pass('one close button in the drawer');
  }
  {
    const {context, page} = await open(1440, 900);
    await makeItOurs(page, 'fun');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'startingFrom', 'Make it ours moves focus to the starting look line');
    assert.equal(await ownText(page, '#startingFrom'), 'Starting from Midnight & gold', 'no count before any change');
    assert.equal(await textOf(page, '#btnSwapLook'), 'Swap starting look');
    await page.evaluate(() => {
      const draft = JSON.parse(localStorage.getItem('bespoke-draft-v2'));
      delete draft.appliedLook;
      localStorage.setItem('bespoke-draft-v2', JSON.stringify(draft));
    });
    await page.reload();
    await page.locator('#localPreviewNotice').waitFor({state: 'visible'});
    assert.equal(await page.locator('#workspace').getAttribute('data-stage'), 'slides');
    assert.equal(await ownText(page, '#startingFrom'), 'Your design', 'an unknown look reads Your design');
    await page.locator('#btnSwapLook').click();
    assert.equal(await page.locator('#workspace').getAttribute('data-stage'), 'start', 'Swap starting look goes to Pick a look');
    await context.close();
    pass('unknown look reads Your design');
  }
  {
    const {context, page} = await open(1440, 900);
    await page.locator('#stage-slides').click();
    await page.locator('#modelStage .slide-title-text').click();
    assert.equal(await page.locator('#context-text').inputValue(), 'Money Management', 'Sample text shows the lesson name');
    assert.equal((await savedDraft(page)).design.samples.title, defaultDesign(catalog).samples.title, 'showing it writes nothing');
    await page.locator('#context-text').fill('Our money plan');
    assert.equal((await savedDraft(page)).design.samples.title, 'Our money plan', 'typing writes the team’s words');
    await context.close();
    pass('Sample text shows the lesson name until the team types');
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await server.close?.();
}
