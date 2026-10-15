#!/usr/bin/env node
// Browser checks for the canvas shell: slim top bar, docked toolbar, hideable options drawer.
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
    const slideTop = (await rect(page, '#modelStage .bespoke-slide')).top;
    assert.ok(slideTop < 220, `slide starts near the top of the window, got ${slideTop}px`);
    pass('top bar is slim and the slide starts near the top');

    await page.locator('#modelStage .slide-title-text').click();
    assert.equal(await page.locator('#contextToolbar.is-floating').count(), 1, 'toolbar floats on wide screens');
    const toolbar = await rect(page, '#contextToolbar');
    const slide = await rect(page, '#modelStage .bespoke-slide');
    assert.ok(toolbar.bottom <= slide.top, `toolbar sits above the slide, never over it (${toolbar.bottom} > ${slide.top})`);
    for (const id of ['#selectedElement', '#context-text', '#context-color', '#context-size', '#context-align', '#context-placement'])
      assert.ok(await page.locator('#contextToolbar ' + id).isVisible(), id + ' is a quick control');
    assert.equal(await page.locator('#contextToolbar #context-font').count(), 0, 'font waits in the drawer');
    pass('toolbar docks above the slide with the quick text controls');

    assert.equal(await page.locator('#workspace').getAttribute('data-options'), 'false');
    assert.equal(await page.locator('#chromeRail').isVisible(), false, 'drawer is closed by default');
    await page.locator('#btnMoreOptions').click();
    assert.equal(await page.locator('#chromeRail').isVisible(), true, 'More slide options opens the drawer');
    assert.equal(await page.locator('#selectionInspector #context-font').count(), 1, 'font control is in the drawer');
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
    assert.ok(await page.locator('#btnSave').evaluate(el => el.classList.contains('btn-secondary')), 'Save is secondary on Review');
    await context.close();
    pass('Review stage demotes Save');
  }
  {
    // Apple HIG: closely related choices on an object are segmented controls; color opens a picker.
    const {context, page} = await open(1440);
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('bespoke-draft-v2')).design);
    await page.locator('#stage-slides').click();
    await page.locator('#modelStage .slide-title-text').click();

    for (const [label, count] of [['Size', 3], ['Align', 3], ['Place in text area', 3]]) {
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
    assert.equal((await saved()).roleStyles.title.headingColor, 'gold');
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
    // Lesson & team is its own first stage so people see it and identify their team.
    const {context, page} = await open(1440);
    const pills = await page.locator('#stepList button').allTextContents();
    assert.equal(pills.length, 4, 'four stages');
    assert.match(pills[0], /Lesson & team/);
    assert.equal(await page.locator('#stage-team').getAttribute('aria-current'), 'step', 'a new visit opens on Lesson & team');
    assert.equal(await page.locator('#workspace').getAttribute('data-stage'), 'team');
    for (const id of ['#lessonSelect', '#teamName', '#spokespersonName', '#spokespersonEmail'])
      assert.ok(await page.locator(id).isVisible(), id + ' is visible without opening anything');
    assert.equal(await page.locator('[data-preset]').count(), 0, 'the starting looks wait on the next stage');
    assert.equal(await page.locator('#stage-team').getAttribute('data-attention'), 'true', 'the pill asks for attention while details are missing');
    pass('a new visit opens on a Lesson & team page with an attention marker');

    await page.locator('#teamName').fill('Riverside Team');
    await page.locator('#spokespersonName').fill('Sample Instructor');
    assert.equal(await page.locator('#stage-team').getAttribute('data-attention'), null, 'the marker clears once the team is identified');
    await page.locator('#btnNext').click();
    assert.equal(await page.locator('#stage-start').getAttribute('aria-current'), 'step');
    assert.ok(await page.locator('[data-preset]').first().isVisible(), 'Continue opens the starting looks');
    assert.match(await page.locator('#stage-team').getAttribute('title'), /Riverside Team/, 'the pill names the team on later stages');
    await page.locator('#btnBack').click();
    assert.equal(await page.locator('#stage-team').getAttribute('aria-current'), 'step', 'Back returns to Lesson & team');
    assert.equal(await page.locator('#teamName').inputValue(), 'Riverside Team');
    pass('Continue and Back move between Lesson & team and the starting looks');

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
    assert.equal(await page.locator('#contextToolbar.is-floating').count(), 0, 'tablet keeps its stacked layout');
    assert.equal(await page.locator('#selectionInspector #contextToolbar').count(), 1);
    await context.close();
    pass('tablet width keeps the inspector layout');
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
