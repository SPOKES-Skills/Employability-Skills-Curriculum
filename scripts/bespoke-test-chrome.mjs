// Browser-side probes for the builder chrome rules: control size, the type scale and motion.
// The chrome is everything outside the slide renders (.bespoke-slide) and outside shadow roots.

// Visible builder controls. Content of a closed details element still reports a box, so it is left out.
export const chromeControls = page => page.evaluate(() => {
  const selector = 'button, select, input, summary, [role=radio], [role=tab]';
  const visible = el => {
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
  };
  return [...document.querySelectorAll(selector)]
    .filter(el => !el.closest('.bespoke-slide') && !el.closest('details:not([open]) > :not(summary)') && visible(el))
    .map(el => {
      const r = el.getBoundingClientRect();
      return {
        id: el.id, tag: el.tagName.toLowerCase(), role: el.getAttribute('role'),
        label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 60),
        left: r.left, top: r.top, width: r.width, height: r.height,
        labelHeight: el.closest('label')?.getBoundingClientRect().height ?? 0
      };
    });
});

// The --fs-* steps declared on :root, each resolved to px, and every visible chrome text whose size is not one of them.
// A font-size of 0 draws no text (icon buttons that show a glyph through ::before), so it is not text to check.
export const chromeFontSizes = page => page.evaluate(() => {
  const names = new Set();
  const collect = rules => {
    for (const rule of rules) {
      if (rule.cssRules) collect(rule.cssRules);
      if (rule.selectorText === ':root') for (const name of rule.style) if (name.startsWith('--fs-')) names.add(name);
    }
  };
  for (const sheet of document.styleSheets) collect(sheet.cssRules);
  const root = getComputedStyle(document.documentElement);
  const probe = document.createElement('span');
  document.body.append(probe);
  const scale = {};
  for (const name of names) {
    probe.style.fontSize = root.getPropertyValue(name);
    scale[name] = parseFloat(getComputedStyle(probe).fontSize);
  }
  probe.remove();
  const steps = Object.values(scale);
  const textTags = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'];
  const hasText = el => textTags.includes(el.tagName) || [...el.childNodes].some(node => node.nodeType === 3 && node.textContent.trim());
  const shown = el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden';
  };
  const describe = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '');
  const offenders = [...document.body.querySelectorAll('*')]
    .filter(el => !['SCRIPT', 'STYLE', 'TEMPLATE', 'OPTION'].includes(el.tagName))
    .filter(el => !el.closest('.bespoke-slide') && !el.closest('details:not([open]) > :not(summary)'))
    .filter(el => hasText(el) && shown(el))
    .map(el => ({el: describe(el), text: el.textContent.trim().slice(0, 40), size: parseFloat(getComputedStyle(el).fontSize)}))
    .filter(item => item.size !== 0 && !steps.some(step => Math.abs(step - item.size) < 0.01));
  return {scale, offenders};
});

// Records every CSS animation and transition that starts, with its timing, so a test can read them after the fact.
export const recordMotion = context => context.addInitScript(() => {
  window.__motion = [];
  // Only the animation the event is about, so a longer one still running is not counted twice.
  const note = event => {
    const name = event.animationName || event.propertyName;
    const animation = event.target.getAnimations().find(item => (item.animationName || item.transitionProperty) === name);
    const timing = animation?.effect.getTiming() ?? {};
    window.__motion.push({event: event.type, name, duration: timing.duration ?? null, iterations: timing.iterations ?? null});
  };
  for (const type of ['animationstart', 'transitionrun']) document.addEventListener(type, note, true);
});

// What recordMotion saw so far, plus the animations still running now.
// Two animation frames first, so the start events of the last action have been sent.
export const motionSeen = page => page.evaluate(async () => {
  await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
  return {
    seen: window.__motion.slice(),
    running: document.getAnimations().map(animation => ({name: animation.animationName || animation.transitionProperty || '', iterations: animation.effect.getTiming().iterations}))
  };
});

// One pass through the moments that move: a hover preview, an apply, a color change and a toast.
// check(moment) runs after each one.
export async function motionTour(page, check) {
  await page.locator('#stage-start').click();
  await page.locator('#preset-horizon').hover();
  await check('a hover preview');
  // A click that does not move the pointer, as on a touch screen, so the apply itself swaps the stage.
  await page.locator('#preset-professional').dispatchEvent('click');
  await check('an apply');
  await page.locator('#btnMakeItOurs').click();
  await page.locator('#workspace[data-stage=slides]').waitFor();
  await page.locator('#modelStage .slide-title-text').click();
  await page.locator('#context-color-well').click();
  await page.locator('#context-color-popover').getByRole('radio', {name: 'Gold', exact: true}).click();
  await check('a color change');
  // The apply's own toast fades out first, so the save toast fades in from hidden.
  await page.locator('#toast.is-visible').waitFor({state: 'hidden', timeout: 8000});
  await page.waitForFunction(() => document.getAnimations().length === 0);
  await page.locator('#btnSave').click();
  await page.locator('#toast.is-visible').waitFor();
  await check('a toast');
}
