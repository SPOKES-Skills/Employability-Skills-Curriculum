#!/usr/bin/env node
// Browser checks from the final review: success messages use the toast and never the notice strip, Undo on
// Pick a look keeps keyboard focus, More options below 1101px lands on Sample text, and the scope line bolds
// the slide name. The rest of the showcase suite is in test-bespoke-showcase.mjs and test-bespoke-showcase-fit.mjs.
import assert from 'node:assert/strict';
import {createDevServer} from './bespoke-dev-server.mjs';
import {browserType} from './bespoke-test-browser.mjs';

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
const failures = [];
// Each case runs on its own, so one failure still lets the others report.
const check = async (name, body) => {
  try { await body(); console.log('ok - ' + name); }
  catch (error) { failures.push(name); console.log(`not ok - ${name}: ${error.message}`); }
};
const stripText = page => page.locator('#fileStatus').evaluate(el => el.hidden ? '' : el.textContent.trim());
const activeId = page => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);

try {
  await check('Undo on Pick a look toasts and keeps keyboard focus', async () => {
    const {context, page} = await open(1440, 900);
    await page.locator('#stage-start').click();
    await page.locator('#preset-fun').click();
    await page.locator('#btnUndoLook').focus();
    await page.keyboard.press('Enter');
    await page.locator('#toast').filter({hasText: /^Undid: /}).waitFor({timeout: 3000});
    assert.equal(await stripText(page), '', 'the notice strip stays hidden after Undo');
    assert.equal(await activeId(page), 'lookStageHeading', 'focus moves to the stage heading, not the page');
    await context.close();
  });
  await check('opening the shared design on reload toasts instead of using the strip', async () => {
    const {context, page} = await open(1440, 900);
    await page.locator('#btnSave').click();
    await page.locator('#toast').filter({hasText: /Local test design saved|already up to date/}).waitFor();
    await page.reload();
    await page.locator('#localPreviewNotice').waitFor({state: 'visible'});
    const opened = 'Opened the latest shared design.';
    await page.locator('#toast, #fileStatus').filter({hasText: opened}).first().waitFor({timeout: 5000});
    assert.equal(await page.locator('#toast').textContent(), opened, 'the toast says the shared design opened');
    assert.doesNotMatch(await stripText(page), /Opened the latest shared design/, 'the strip does not');
    await context.close();
  });
  await check('Download backup on Send toasts instead of using the strip', async () => {
    const {context, page} = await open(1440, 900);
    await page.locator('#stage-review').click();
    const download = page.waitForEvent('download');
    await page.evaluate(() => document.getElementById('btnDownloadBackup').click());
    await download;
    await page.locator('#toast').filter({hasText: /^Backup downloaded/}).waitFor({timeout: 3000});
    assert.equal(await stripText(page), '', 'no yellow strip above the Send stage');
    await context.close();
  });
  await check('Undo on Send clears the saved message beside the buttons', async () => {
    const {context, page} = await open(1440, 900);
    await page.locator('#stage-start').click();
    await page.locator('#preset-fun').click();
    await page.locator('#stage-review').click();
    await page.locator('#btnSendSave').click();
    const saved = /Local test design saved|already up to date/;
    await page.locator('#sendFeedback').filter({hasText: saved}).waitFor({timeout: 4000});
    await page.locator('#btnSendSave').focus();
    await page.keyboard.press('ControlOrMeta+z');
    await page.locator('#toast').filter({hasText: /^Undid: /}).waitFor({timeout: 3000});
    assert.doesNotMatch(await page.locator('#sendFeedback').textContent(), saved, 'the saved message leaves once the design changes');
    await context.close();
  });
  await check('More options below 1101px lands on Sample text', async () => {
    const {context, page} = await open(1024, 768);
    await page.locator('#stage-slides').click();
    await page.locator('#modelStage .slide-title-text').click();
    await page.locator('#btnMoreOptions').click();
    assert.equal(await activeId(page), 'context-text', 'Sample text takes focus');
    const placed = await page.locator('#context-text').evaluate(el => {
      const r = el.getBoundingClientRect();
      return {inMore: Boolean(el.closest('#inspectorMore')), inView: r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth};
    });
    assert.ok(placed.inMore, 'Sample text sits in the Slide options drawer');
    assert.ok(placed.inView, 'Sample text is scrolled into the window');
    await context.close();
  });
  await check('the scope line bolds the slide name', async () => {
    const {context, page} = await open(1440, 900);
    await page.locator('#stage-start').click();
    await page.locator('#preset-professional').click();
    await page.locator('#btnMakeItOurs').click();
    await page.locator('#workspace[data-stage=slides]').waitFor();
    await page.locator('#modelStage .slide-title-text').click();
    await page.locator('#context-color-well').click();
    await page.locator('#context-color-popover').getByRole('radio', {name: 'Gold', exact: true}).click();
    assert.deepEqual(await page.locator('#scopeLine strong').allTextContents(), ['Divider']);
    await context.close();
  });
  assert.deepEqual(errors, [], 'no page errors');
  assert.deepEqual(failures, [], 'every case passes');
} finally {
  await browser.close();
  await server.close?.();
}
