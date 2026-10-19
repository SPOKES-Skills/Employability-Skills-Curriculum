#!/usr/bin/env node
// Browser checks for the showcase polish: stage names, plain words, and the chrome rules later cases extend.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDevServer} from './bespoke-dev-server.mjs';
import {browserType} from './bespoke-test-browser.mjs';
import {clickMenuItem} from './bespoke-test-navigation.mjs';

const server = await createDevServer({port: 0});
const browser = await browserType.launch({headless: true});
const errors = [];
const open = async (width, height = 900, reducedMotion = 'reduce') => {
  const context = await browser.newContext({viewport: {width, height}, reducedMotion});
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
const pass = name => console.log('ok - ' + name);

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
    await page.locator('#btnSave').click();
    const toast = page.locator('#toast');
    await toast.waitFor({state: 'visible', timeout: 4000});
    assert.equal(await page.locator('#toast').count(), 1, 'one #toast element is reused');
    assert.equal(await toast.getAttribute('role'), 'status');
    assert.equal(await toast.getAttribute('aria-live'), 'polite');
    assert.match(await toast.textContent(), /Local test design saved|already up to date/, 'the toast carries the success message');
    const box = await rect(page, '#toast');
    assert.ok(box.top >= 0 && box.top <= 120, `toast sits near the top of the viewport, top is ${box.top}px`);
    assert.equal(await toast.evaluate(el => getComputedStyle(el).position), 'fixed', 'the toast is fixed to the viewport');
    assert.equal(await page.locator('#fileStatus').isVisible(), false, 'the page-top strip stays hidden for a success message');
    await page.waitForTimeout(5000);
    assert.equal(await toast.isVisible(), false, 'the toast hides itself after a few seconds');
    await context.close();
    pass('success messages are toasts');
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await server.close?.();
}
