// User-facing navigation for the current three-stage builder. No state injection.
// Keep preview selection explicit in tests: inspecting a preview is not editing it.
const roles = {
  'Title slide':'title', 'Chapter divider':'divider', 'Text boxes':'cards',
  'Video slide':'video', Activity:'activity'
};

export const EDITOR_DESTINATIONS = [
  'Start', 'Shared colors', 'Shared typography', ...Object.keys(roles), 'Review & save'
];

export async function builderDestination(page, destination) {
  const designSurface = page.locator('#surface-design');
  if (await designSurface.isVisible()) await designSurface.click();
  if (destination === 'Shared colors' || destination === 'Shared typography') {
    if (!await page.locator('#sharedTheme').count()) await page.locator('#stage-slides').click();
    if (!await page.locator('#detailControls').isVisible()) await page.locator('#btnMoreOptions').click();
    const theme = page.locator('#sharedTheme');
    if (!await theme.evaluate(el => el.open)) await theme.locator(':scope > summary').click();
    await page.locator(destination === 'Shared colors' ? '#colorRole' : '#font-heading').waitFor({state:'visible'});
    // Existing shared-typography journeys explicitly edit shared defaults.
    if (destination === 'Shared typography') await page.locator('#themeScope').selectOption('shared');
    return;
  }
  if (roles[destination]) {
    await page.locator('#stage-slides').click();
    if (!await page.locator('#roleEditorTabs').isVisible()) await page.locator('#btnMoreOptions').click();
    await page.locator('#editor-'+roles[destination]).click();
    return;
  }
  // Lesson & team is its own first stage; the starting looks are the second.
  if (destination === 'Start') {
    await page.locator('#stage-team').click();
    await page.locator('#teamName').waitFor({state: 'visible'});
    return;
  }
  if (destination === 'Starting look') {
    await page.locator('#stage-start').click();
    if (!await page.locator('[data-preset]').first().isVisible()) {
      await page.locator('#btnChangeStartingLook').click();
    }
    return;
  }
  if (destination === 'Review & save') {
    await page.locator('#stage-review').click();
    return;
  }
  throw new Error('Unknown builder destination: '+destination);
}

export async function recoveryMenu(page, open) {
  const menu = page.locator('.more-menu');
  if (await menu.evaluate(el => el.open) !== open) await menu.locator(':scope > summary').click();
}

export async function switchSurface(page, surface) {
  const tab=page.locator('#surface-'+surface);
  if(await tab.isVisible())await tab.click();
}

export async function otherStartingPaths(page) {
 const section=page.locator('#otherStartingPaths');
 if(!await section.evaluate(n=>n.open))await section.locator('summary').click();
}

// Header actions other than Save, Undo and Redo live in the top bar's ⋯ menu.
export async function openMoreMenu(page) {
  const menu = page.locator('.more-menu');
  if (!await menu.evaluate(el => el.open)) await menu.locator(':scope > summary').click();
}

// Click a control that is either visible in the bar or inside the ⋯ menu.
export async function clickMenuItem(page, selector) {
  const target = page.locator(selector);
  if (!await target.isVisible()) await openMoreMenu(page);
  await target.click();
}
