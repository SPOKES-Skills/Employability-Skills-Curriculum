#!/usr/bin/env node
// Browser checks for the canvas shell: slim top bar, docked toolbar, hideable options drawer and its Escape key.
import assert from 'node:assert/strict';
import {createDevServer} from './bespoke-dev-server.mjs';
import {browserType} from './bespoke-test-browser.mjs';
import {clickMenuItem, openMoreMenu} from './bespoke-test-navigation.mjs';

const server = await createDevServer({port: 0});
const browser = await browserType.launch({headless: true});
const errors = [];
const open = async width => {
  const context = await browser.newContext({viewport: {width, height: 900}, reducedMotion: 'reduce'});
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

try {
  {
    const {context, page} = await open(1440);
    await page.locator('#stage-slides').click();
    assert.equal(await page.locator('#workspace').getAttribute('data-editor'), 'true');

    const bar = await rect(page, '.app-bar');
    assert.ok(bar.height <= 64, `top bar is slim, got ${bar.height}px`);
    // The toolbar band above the slide pushes it down (it never floats over it), and the whole slide still fits the window.
    const stage = await rect(page, '#modelStage .bespoke-slide');
    assert.ok(stage.top < 340, `slide starts in the top third of the window, got ${stage.top}px`);
    assert.ok(stage.bottom <= 900, `the whole slide fits the window, bottom ${stage.bottom}px`);
    pass('top bar is slim and the slide fits under the toolbar band');

    await page.locator('#modelStage .slide-title-text').click();
    assert.equal(await page.locator('#previewToolbarMount > #contextToolbar.is-docked').count(), 1, 'toolbar docks in the band above the slide');
    assert.equal(await page.locator('#contextToolbar').evaluate(el => getComputedStyle(el).position), 'static', 'the toolbar is in normal flow, not floating');
    const toolbar = await rect(page, '#contextToolbar');
    const slide = await rect(page, '#modelStage .bespoke-slide');
    assert.ok(toolbar.bottom <= slide.top, `toolbar sits above the slide, never over it (${toolbar.bottom} > ${slide.top})`);
    for (const id of ['#selectedElement', '#context-text', '#context-font', '#context-color', '#context-size', '#context-align', '#context-placement'])
      assert.ok(await page.locator('#contextToolbar ' + id).isVisible(), id + ' is a quick control');
    assert.equal(await page.locator('#contextToolbar #context-only-slide').count(), 0, 'Only this slide waits in the drawer');
    pass('toolbar docks above the slide with the quick text controls, font included');

    assert.equal(await page.locator('#workspace').getAttribute('data-options'), 'false');
    assert.equal(await page.locator('#chromeRail').isVisible(), false, 'drawer is closed by default');
    await page.locator('#btnMoreOptions').click();
    assert.equal(await page.locator('#chromeRail').isVisible(), true, 'More slide options opens the drawer');
    assert.equal(await page.locator('#selectionInspector #context-only-slide').count(), 1, 'the Only this slide switch is in the drawer');
    assert.ok(await page.locator('#btnHideDrawer').isVisible(), 'Hide options button is visible while the drawer is open');
    pass('options drawer is closed by default and opens on request');

    await page.locator('#btnHideDrawer').click();
    assert.equal(await page.locator('#workspace').getAttribute('data-options'), 'false');
    assert.equal(await page.locator('#chromeRail').isVisible(), false, 'Hide options closes the drawer');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'btnMoreOptions', 'focus returns to the control that opened it');
    pass('Hide options closes the drawer and returns focus');

    await clickMenuItem(page, '#btnHelp');
    assert.equal(await page.locator('#builderHelp').isVisible(), true);
    await page.locator('#btnCloseHelp').click();
    assert.equal(await page.evaluate(() => document.activeElement.matches('.more-menu > summary')), true, 'closing help returns focus to the menu trigger');
    pass('menu items work and help returns focus to the trigger');

    await openMoreMenu(page);
    for (const id of ['#btnHelp', '#btnOpen', '#btnHistory', '#btnLeaveSession', '#btnDownloadBackup'])
      assert.ok(await page.locator(id).isVisible(), id + ' is in the menu');
    await page.keyboard.press('Escape');

    await page.locator('#stage-review').click();
    for (const id of ['#btnSave', '#btnSend'])
      assert.equal(await page.locator(id).isVisible(), false, `${id} is not in the top bar on Send`);
    assert.equal(await page.locator('#barEnd > #btnSend').count(), 0, 'Send to Britt is not promoted into the bar');
    const saves = await page.getByRole('button', {name: /^Save (for the team|test design)$/}).evaluateAll(list => list.map(el => el.id));
    assert.deepEqual(saves, ['btnSendSave'], 'the panel holds the only Save on Send');
    assert.equal(await page.locator('#btnSendToBritt').count(), 1, 'the panel holds Send to Britt');
    await page.locator('#stage-slides').click();
    assert.equal(await page.locator('#btnSave').isVisible(), true, 'Save is back in the top bar off Send');
    await context.close();
    pass('Send stage keeps both actions in the panel');
  }
  {
    // Apple HIG: closely related choices on an object are segmented controls; color opens a picker.
    const {context, page} = await open(1440);
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('bespoke-draft-v2')).design);
    await page.locator('#stage-slides').click();
    await page.locator('#modelStage .slide-title-text').click();

    for (const [label, count] of [['Size', 3], ['Align', 3], ['Position', 3]]) {
      const group = page.locator(`#contextToolbar [role=radiogroup][aria-label="${label}"]`);
      assert.equal(await group.count(), 1, `${label} is a segmented control`);
      assert.equal(await group.getByRole('radio').count(), count, `${label} segment count`);
      assert.equal(await group.locator('[aria-checked=true]').count(), 1, `${label} has one checked segment`);
      for (const radio of await group.getByRole('radio').all())
        assert.ok((await radio.boundingBox()).height >= 44, `${label} segment keeps a 44px target`);
    }
    const size = page.locator('#contextToolbar [role=radiogroup][aria-label="Size"]');
    await size.getByRole('radio', {name: 'Larger'}).click();
    assert.equal((await saved()).roleStyles.title.headingSize, 'large', 'clicking a segment changes the design');
    assert.equal(await page.locator('#context-size').inputValue(), 'large', 'native select mirrors the choice');
    assert.equal(await size.getByRole('radio', {name: 'Larger'}).getAttribute('aria-checked'), 'true');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label') || document.activeElement.textContent), 'Larger', 'focus stays on the chosen segment');
    await page.keyboard.press('ArrowLeft');
    assert.equal((await saved()).roleStyles.title.headingSize, 'default', 'arrow keys move the selection like a radio group');
    pass('Size, Align and Placement are segmented controls with radio semantics');

    const well = page.locator('#context-color-well');
    assert.equal(await well.getAttribute('aria-expanded'), 'false');
    await well.click();
    const popover = page.locator('#context-color-popover');
    assert.ok(await popover.isVisible(), 'color well opens a picker');
    assert.equal(await popover.getByRole('radio').count(), 11, 'all eleven brand colors are offered');
    await popover.getByRole('radio', {name: 'Gold', exact: true}).click();
    // Toolbar color picks are shared by default (PR #56), so read the color the slide shows.
    assert.equal(await page.locator('#modelStage .slide-title-text').evaluate(el => getComputedStyle(el).color), 'rgb(211, 178, 87)', 'the pick reaches the slide');
    assert.equal(await page.locator('#context-color-popover').isVisible(), false, 'picking a color closes the picker');
    await page.locator('#context-color-well').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#context-color-popover').isVisible(), false, 'Escape closes the picker');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'context-color-well', 'focus returns to the color well');
    await page.locator('#context-color-well').click();
    await page.locator('#modelStage .slide-subtitle, #modelStage .slide-body').first().click({force: true});
    assert.equal(await page.locator('#context-color-popover').count() === 0 || !await page.locator('#context-color-popover').isVisible(), true, 'clicking elsewhere closes the picker');
    pass('color opens a swatch picker that closes on pick, Escape and outside click');

    await page.locator('#modelStage .slide-title-text').click();
    assert.equal(await page.locator('#chromeRail').isVisible(), false);
    await page.keyboard.press('Control+Alt+o');
    assert.equal(await page.locator('#chromeRail').isVisible(), true, 'shortcut opens the options drawer');
    await page.keyboard.press('Control+Alt+o');
    assert.equal(await page.locator('#chromeRail').isVisible(), false, 'shortcut hides the options drawer');
    await openMoreMenu(page);
    assert.ok(await page.locator('#btnMenuOptions').isVisible(), 'menu offers a Slide options command');
    await page.locator('#btnMenuOptions').click();
    assert.equal(await page.locator('#chromeRail').isVisible(), true, 'menu command opens the drawer');
    await context.close();
    pass('options drawer toggles from toolbar, shortcut and menu');
  }
  {
    // Ruling R27: Escape closes the open drawer first; with it closed, Escape on the canvas selects the background.
    const {context, page} = await open(1440);
    const options = () => page.locator('#workspace').getAttribute('data-options');
    const focused = () => page.evaluate(() => document.activeElement.id);
    await page.locator('#stage-slides').click();
    await page.locator('#modelStage .slide-title-text').click();
    await page.locator('#btnMoreOptions').click();
    await page.locator('#btnHideDrawer').focus();
    await page.keyboard.press('Tab');
    assert.ok(await page.evaluate(() => document.getElementById('chromeRail').contains(document.activeElement)), 'focus is inside the drawer');
    await page.keyboard.press('Escape');
    assert.equal(await options(), 'false', 'Escape closes the open drawer');
    assert.equal(await focused(), 'btnMoreOptions', 'focus returns to More options');
    pass('Escape closes the open drawer and returns focus to More options');

    await page.locator('#btnMoreOptions').click();
    await page.locator('#modelStage .slide-title-text').focus();
    await page.keyboard.press('Escape');
    assert.equal(await options(), 'false', 'Escape on the canvas closes the open drawer first');
    assert.equal(await page.locator('#selectedElement').inputValue(), 'heading-0', 'the selection stays while the drawer closes');
    await page.locator('#modelStage .slide-title-text').focus();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#selectedElement').inputValue(), 'background', 'with the drawer closed, Escape selects the background');
    pass('with the drawer closed, Escape on the canvas selects the background');

    await page.locator('#modelStage .slide-title-text').click();
    await page.locator('#btnMoreOptions').click();
    await page.locator('#context-color-well').click();
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#context-color-popover').count() === 0 || !await page.locator('#context-color-popover').isVisible(), true, 'Escape closes the color picker');
    assert.equal(await options(), 'true', 'the drawer stays open while Escape closes the picker');
    assert.equal(await focused(), 'context-color-well', 'focus returns to the color well');
    await page.keyboard.press('Escape');
    assert.equal(await options(), 'false', 'a second Escape closes the drawer');
    await context.close();
    pass('Escape closes the color picker before the drawer');
  }
  {
    // Lesson & team is its own first stage so people see it and identify their team.
    const {context, page} = await open(1440);
    const pills = await page.locator('#stepList button').allTextContents();
    assert.equal(pills.length, 4, 'four stages');
    assert.match(pills[0], /Lesson & team/);
    assert.equal(await page.locator('#stage-team').getAttribute('aria-current'), 'step', 'a new visit opens on Lesson & team');
    assert.equal(await page.locator('#workspace').getAttribute('data-stage'), 'team');
    for (const id of ['#lessonSelect', '#teamName', '#spokespersonName', '#spokespersonEmail'])
      assert.ok(await page.locator(id).isVisible(), id + ' is visible without opening anything');
    assert.equal(await page.locator('#lookStrip > [data-look]').count(), 0, 'the looks wait on Pick a look');
    assert.equal(await page.locator('#stage-team').getAttribute('data-attention'), 'true', 'the pill asks for attention while details are missing');
    pass('a new visit opens on a Lesson & team page with an attention marker');

    await page.locator('#teamName').fill('Riverside Team');
    await page.locator('#spokespersonName').fill('Sample Instructor');
    assert.equal(await page.locator('#stage-team').getAttribute('data-attention'), null, 'the marker clears once the team is identified');
    await page.locator('#btnNext').click();
    assert.equal(await page.locator('#stage-start').getAttribute('aria-current'), 'step');
    assert.ok(await page.locator('#lookStrip > [data-look]').first().isVisible(), 'Continue opens Pick a look');
    assert.match(await page.locator('#stage-team').getAttribute('title'), /Riverside Team/, 'the pill names the team on later stages');
    // Pick a look fills the workspace (Task 4), so its panel's Back button is hidden; the stage pill goes back.
    assert.equal(await page.locator('#btnBack').isVisible(), false, 'Pick a look shows no panel Back button');
    await page.locator('#stage-team').click();
    assert.equal(await page.locator('#stage-team').getAttribute('aria-current'), 'step', 'the pill returns to Lesson & team');
    assert.equal(await page.locator('#teamName').inputValue(), 'Riverside Team');
    pass('Continue and the stage pill move between Lesson & team and Pick a look');

    // Leaving a field must not rebuild the stage pills under the pointer and swallow the click.
    await page.locator('#teamName').fill('Riverside Team 2');
    await page.locator('#stage-slides').click();
    assert.equal(await page.locator('#stage-slides').getAttribute('aria-current'), 'step', 'the first click on a stage pill works right after typing');
    await page.locator('#stage-team').click();
    pass('a stage pill responds to its first click right after typing');

    await page.reload();
    await page.locator('#localPreviewNotice').waitFor({state: 'visible'});
    assert.equal(await page.locator('#stage-team').getAttribute('aria-current'), 'step', 'reload keeps the stage');
    assert.equal(await page.locator('#spokespersonName').inputValue(), 'Sample Instructor', 'reload keeps the team');
    await context.close();
    pass('stage and team survive a reload');
  }
  {
    const {context, page} = await open(1024);
    await page.locator('#stage-slides').click();
    await page.locator('#modelStage .slide-title-text').click();
    // The 761 to 1100 layout docks the toolbar above the slide too, instead of a sidebar form.
    assert.equal(await page.locator('#previewToolbarMount > #contextToolbar.is-docked').count(), 1, 'tablet docks the toolbar above the slide');
    assert.equal(await page.locator('#selectionInspector #contextToolbar').count(), 0, 'the toolbar is no longer a sidebar form');
    assert.ok((await rect(page, '#contextToolbar')).bottom <= (await rect(page, '#modelStage .bespoke-slide')).top, 'tablet toolbar sits above the slide');
    await context.close();
    pass('tablet width docks the toolbar above the slide');
  }
  for (const width of [390, 320]) {
    const {context, page} = await open(width);
    for (const stage of ['#stage-start', '#stage-slides', '#stage-review']) {
      const surface = page.locator('#surface-design');
      if (await surface.isVisible()) await surface.click();
      await page.locator(stage).click();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${width}px ${stage}: no horizontal overflow`);
    }
    await openMoreMenu(page);
    const menu = await rect(page, '.more-menu-list');
    assert.ok(menu.left >= 0 && menu.right <= width, `${width}px: menu stays inside the screen`);
    await context.close();
    pass(`${width}px top bar and menu fit the screen`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await server.close?.();
}
