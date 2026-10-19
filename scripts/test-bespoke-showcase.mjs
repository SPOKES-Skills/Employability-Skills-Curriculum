#!/usr/bin/env node
// Browser checks for the showcase polish: stage names, plain words, and the chrome rules later cases extend.
import assert from 'node:assert/strict';
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
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await server.close?.();
}
