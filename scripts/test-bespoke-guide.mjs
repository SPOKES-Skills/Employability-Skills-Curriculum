import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {
  SECTIONS, advance, back, buildQuestions, byIdMap, guideMark, indexForMark, jumpToQuestion, jumpToSection,
  keepsGuide, normalizeGuide, questionAt, sectionsOf, skipSection, startGuide
} from '../bespoke/guide/questions.mjs';

export const catalog = JSON.parse(fs.readFileSync(new URL('../bespoke/builder-catalog.json', import.meta.url), 'utf8'));
const all = buildQuestions(catalog);
const byId = byIdMap(all);

test('the guide has 40 questions, or 39 when the team is already filled in', () => {
  assert.equal(buildQuestions(catalog).length, 40);
  assert.equal(buildQuestions(catalog, { teamComplete: true }).length, 39);
  assert.equal(buildQuestions(catalog, { teamComplete: true }).some(q => q.kind === 'team'), false);
});

test('sections run start, shared, then one per slide type in lesson order', () => {
  const seen = [...new Set(all.map(q => q.section))];
  assert.deepEqual(seen, SECTIONS.map(s => s.id));
  assert.deepEqual(seen.slice(2), ['title', 'divider', 'cards', 'video', 'activity']);
});

test('inside a slide type layout comes first (after the box count for Text boxes), recap comes last', () => {
  for (const kind of ['title', 'divider', 'cards', 'video', 'activity']) {
    const list = all.filter(q => q.section === kind);
    assert.equal(list[0].kind, 'decision');
    assert.equal(list[0].decision, kind === 'cards' ? 'count' : 'layout', kind);
    if (kind === 'cards') assert.equal(list[1].decision, 'layout', 'cards asks layout right after the count');
    assert.equal(list.at(-1).kind, 'recap', kind);
    const firstColor = list.findIndex(q => q.kind === 'background');
    const lastDecision = list.map(q => q.kind).lastIndexOf('decision');
    assert.ok(firstColor > lastDecision, `${kind} asks background after its structural decisions`);
  }
});

test('colors and watermark decisions are not asked as structural questions', () => {
  assert.equal(all.some(q => q.kind === 'decision' && ['colors', 'watermark'].includes(q.decision)), false);
  assert.ok(byId.get('divider.watermark'), 'divider has a watermark question of its own');
  assert.equal(byId.has('video.text'), false, 'video body text is hidden by the model, so it is not asked');
});

test('every question id is unique', () => {
  assert.equal(new Set(all.map(q => q.id)).size, all.length);
});

test('startGuide, advance and back walk the list and finish cleanly', () => {
  let g = startGuide(all);
  assert.equal(g.on, true);
  g = advance(g);
  assert.equal(g.index, 1);
  assert.equal(back(g).index, 0);
  assert.equal(back(back(g)).index, 0, 'Back stops at the first question');
  for (let i = 0; i < all.length + 3; i += 1) g = advance(g);
  assert.equal(g.done, true);
  assert.equal(g.on, false);
});

test('advance never mutates its input', () => {
  const g = Object.freeze(startGuide(all));
  advance(g);
  assert.equal(g.index, 0);
});

test('teams can jump back to reached sections and never ahead of them', () => {
  let g = startGuide(all);
  for (let i = 0; i < 12; i += 1) g = advance(g);
  const sections = sectionsOf(g, byId);
  assert.equal(sections.find(s => s.id === 'start').reached, true);
  assert.equal(sections.find(s => s.id === 'activity').reached, false);
  const before = g.index;
  assert.equal(jumpToSection(g, 'activity', byId).index, before, 'an unreached section stays put');
  assert.equal(jumpToSection(g, 'start', byId).index, 0);
  assert.equal(jumpToQuestion(g, 'activity.layout').index, before);
  assert.equal(jumpToQuestion(g, 'preset').index, all.findIndex(q => q.id === 'preset'));
});

test('skipSection moves to the first question of the next section, or finishes', () => {
  let g = jumpToQuestion({ ...startGuide(all), furthest: all.length - 1 }, 'title.logo');
  g = skipSection(g, byId);
  assert.equal(questionAt(g, byId).id, 'divider.layout');
  const last = { ...startGuide(all), index: all.length - 2, furthest: all.length - 1 };
  const finished = skipSection(last, byId);
  assert.equal(finished.done, true);
});

test('normalizeGuide rejects garbage and repairs out-of-range positions', () => {
  assert.equal(normalizeGuide(null, all), null);
  assert.equal(normalizeGuide('x', all), null);
  assert.equal(normalizeGuide({ ids: 'nope' }, all), null);
  assert.equal(normalizeGuide({ ids: ['not-a-question'] }, all), null);
  const fixed = normalizeGuide({ ids: ['preset', 'ghost', 'shared.fonts'], index: 99, furthest: -4, on: true }, all);
  assert.deepEqual(fixed.ids, ['preset', 'shared.fonts']);
  assert.equal(fixed.index, 1);
  assert.equal(fixed.furthest, 1);
  assert.equal(fixed.on, true);
  assert.equal(fixed.done, false);
});

import * as Model from '../bespoke/builder-model.mjs';
import { SUGGESTED, applyAnswer, currentValue, optionsFor, readabilityNote, recapLines } from '../bespoke/guide/answers.mjs';

const base = () => Model.defaultDesign(catalog);
const asked = all.filter((q) => !['team', 'recap'].includes(q.kind));

function everyOption(design, q) {
  const { options, more } = optionsFor(catalog, design, q);
  return [...options, ...more];
}

test('the default design is valid, so the guide starts from something usable', () => {
  assert.deepEqual(Model.validateDesign(catalog, base()), []);
});

test('every option of every question yields a valid design that renders its own view', () => {
  for (const q of asked) {
    const choices = everyOption(base(), q);
    assert.ok(choices.length >= 2, `${q.id} offers at least two choices`);
    for (const option of choices) {
      const next = applyAnswer(catalog, base(), q, option.id);
      assert.deepEqual(Model.validateDesign(catalog, next), [], `${q.id} ${option.id}`);
      assert.doesNotThrow(() => Model.renderSlide(catalog, next, q.view, { title: 'T', subtitle: 'S' }), `${q.id} ${option.id}`);
    }
  }
});

test('a choice other than the current one changes the design', () => {
  for (const q of asked) {
    const d = base();
    const current = currentValue(catalog, d, q);
    const other = everyOption(d, q).find((o) => o.id !== current);
    const next = applyAnswer(catalog, d, q, other.id);
    assert.notDeepEqual(next, d, `${q.id} ${other.id}`);
  }
});

test('applyAnswer never mutates the design it is given', () => {
  const frozen = structuredClone(base());
  const before = JSON.stringify(frozen);
  for (const q of asked) applyAnswer(catalog, frozen, q, everyOption(frozen, q)[0].id);
  assert.equal(JSON.stringify(frozen), before);
});

test('current value is found for every kind on the default design', () => {
  assert.equal(currentValue(catalog, base(), byId.get('shared.fonts')), 'dm-serif-display-outfit');
  assert.equal(currentValue(catalog, base(), byId.get('shared.pattern')), base().background);
  assert.equal(currentValue(catalog, base(), byId.get('title.layout')), base().slides.title.layout);
  assert.equal(currentValue(catalog, base(), byId.get('cards.titleBar')), String(base().slides.cards.titleBar));
  assert.equal(currentValue(catalog, base(), byId.get('title.background')), 'inherit');
});

test('boolean and numeric decisions round-trip through string ids', () => {
  const bar = applyAnswer(catalog, base(), byId.get('cards.titleBar'), 'false');
  assert.equal(bar.slides.cards.titleBar, false);
  const count = applyAnswer(catalog, base(), byId.get('cards.count'), '3');
  assert.equal(count.slides.cards.count, '3');
});

test('color questions offer four suggestions ranked by readability, then the rest under More colors', () => {
  const q = byId.get('cards.heading');
  const { options, more } = optionsFor(catalog, base(), q);
  const colors = options.filter((o) => o.id !== 'inherit');
  assert.equal(colors.length, SUGGESTED + (colors.some((o) => o.current) ? 1 : 0));
  for (let i = 1; i < SUGGESTED; i += 1) assert.ok(colors[i - 1].ratio >= colors[i].ratio, 'suggestions run best first');
  const worstSuggested = Math.min(...colors.slice(0, SUGGESTED).map((o) => o.ratio));
  assert.ok(more.every((o) => o.ratio <= worstSuggested + 1e-9), 'nothing under More colors beats a suggestion');
  const ids = [...colors, ...more].map((o) => o.id);
  assert.equal(new Set(ids).size, catalog.palette.length, 'all eleven colors are reachable, none twice');
});

test('the first color question option matches the shared look', () => {
  const { options } = optionsFor(catalog, base(), byId.get('title.heading'));
  assert.equal(options[0].id, 'inherit');
  assert.match(options[0].label, /shared look/i);
});

test('a chosen color that is not in the top four is still shown, marked current', () => {
  const q = byId.get('cards.heading');
  const worst = optionsFor(catalog, base(), q).more.at(-1);
  const next = applyAnswer(catalog, base(), q, worst.id);
  const { options, more } = optionsFor(catalog, next, q);
  const shown = options.find((o) => o.id === worst.id);
  assert.ok(shown && shown.current, 'current color is shown with the suggestions');
  assert.equal(more.some((o) => o.id === worst.id), false);
});

test('readability ranking on a gradient slide uses both gradient colors', () => {
  let d = base();
  d = Model.setRoleStyle(catalog, d, 'title', 'backgroundMode', 'gradient');
  d = Model.setRoleStyle(catalog, d, 'title', 'primary', 'dark');
  d = Model.setRoleStyle(catalog, d, 'title', 'secondary', 'light');
  const { options, more } = optionsFor(catalog, d, byId.get('title.heading'));
  const all = [...options, ...more];
  const ratio = (id) => all.find((o) => o.id === id).ratio;
  assert.ok(ratio('light') < 1.5, 'white text is unreadable on the white end of a navy to white gradient');
  assert.ok(ratio('dark') < 1.5, 'navy text is unreadable on the navy end');
  const middle = all.filter((o) => o.ratio != null && !['light', 'dark'].includes(o.id)).map((o) => o.ratio);
  assert.ok(Math.max(...middle) > ratio('light'), 'a mid-tone color beats either extreme');
});

test('readability words are plain and carry the ratio', () => {
  assert.equal(readabilityNote(7.2, 4.5), 'Easy to read');
  assert.match(readabilityNote(2.04, 3), /^Hard to read \(2\.0 to 1, aim for 3 to 1\)$/);
  assert.equal(readabilityNote(3, 0), '');
});

test('showing the chapter number works even when the design had hidden the watermark', () => {
  const d = base();
  d.slides.divider.watermark = 'hide';
  const next = applyAnswer(catalog, d, byId.get('divider.watermark'), 'inherit');
  assert.equal(Model.effectiveRoleStyle(catalog, next, 'divider').watermarkMode, 'legacy');
  assert.equal(Model.effectiveRoleStyle(catalog, applyAnswer(catalog, d, byId.get('divider.watermark'), 'off'), 'divider').watermarkMode, 'off');
});

test('the guide calls a color hard to read exactly when the model advises against it', () => {
  const roleFor = (q) => (['title', 'divider'].includes(q.slide)
    ? (q.field === 'headingColor' ? 'titleText' : 'subtitle')
    : (q.field === 'headingColor' ? 'heading' : 'body'));
  for (const id of ['title.heading', 'cards.heading', 'cards.text', 'activity.heading', 'video.heading', 'divider.text']) {
    const q = byId.get(id);
    const { options, more } = optionsFor(catalog, base(), q);
    for (const o of [...options, ...more].filter((x) => x.id !== 'inherit')) {
      const modelSaysHard = Model.contrastIssues(catalog, applyAnswer(catalog, base(), q, o.id)).some((i) => i.kind === q.slide && i.role === roleFor(q));
      assert.equal(o.note.startsWith('Hard to read'), modelSaysHard, `${id} ${o.id} (${o.ratio.toFixed(2)})`);
    }
  }
});

test('a hard-to-read color stays selectable and valid', () => {
  const q = byId.get('cards.heading');
  const gold = applyAnswer(catalog, base(), q, 'gold');
  assert.deepEqual(Model.validateDesign(catalog, gold), []);
  assert.ok(Model.contrastIssues(catalog, gold).length > 0, 'the model reports it as advice, not as an error');
});

test('applying a preset keeps the team sample text', () => {
  const d = base();
  d.samples.title = 'My custom title';
  const next = applyAnswer(catalog, d, byId.get('preset'), 'fun');
  assert.equal(next.samples.title, 'My custom title');
  assert.equal(next.startingPoint, 'fun');
});

test('recap lines name each asked question with its current choice', () => {
  const lines = recapLines(catalog, base(), all.filter((q) => q.section === 'title'));
  assert.ok(lines.length >= 4);
  assert.ok(lines.every((l) => l.id && l.text.includes(':')));
  assert.ok(lines.some((l) => l.id === 'title.layout' && /Centered|Left|Bottom|Split/.test(l.text)));
});

import { FORBIDDEN, questionCopy, sectionLabel } from '../bespoke/guide/copy.mjs';

test('every question has a real title and prompt', () => {
  for (const q of all) {
    const c = questionCopy(q);
    assert.ok(c.title && c.title !== q.id, `${q.id} has a title`);
    assert.ok(c.prompt && c.prompt.length > 8, `${q.id} has a prompt`);
  }
  for (const s of SECTIONS) assert.equal(sectionLabel(s.id), s.label);
});

test('guide copy and every option label avoid design jargon and color codes', () => {
  const words = [];
  for (const q of all) {
    const c = questionCopy(q);
    words.push(c.title, c.prompt);
    const { options, more } = optionsFor(catalog, base(), q);
    for (const o of [...options, ...more]) words.push(o.label, o.detail ?? '', o.note ?? '');
  }
  for (const w of words) {
    assert.doesNotMatch(w, FORBIDDEN, `"${w}" looks like jargon`);
  }
});

test('the forbidden-words rule catches what it should', () => {
  for (const bad of ['Pick a role', 'titleBackground', '#a7253f', 'Set the CSS', 'rgba(0,0,0,0.5)', 'inherit']) {
    assert.match(bad, FORBIDDEN, bad);
  }
  for (const fine of ['Sidebar color', 'Match shared look', 'Hard to read (2.0 to 1, aim for 3 to 1)', 'DM Serif Display + Outfit']) {
    assert.doesNotMatch(fine, FORBIDDEN, fine);
  }
});

test('a view-only session disables every guide control and never saves guide state', () => {
  const source = fs.readFileSync(new URL('../bespoke/builder-app.mjs', import.meta.url), 'utf8');
  const lock = source.slice(source.indexOf('function lockViewControls()'), source.indexOf('function renderTeam('));
  assert.match(lock, /if \(isLeadSession\(\)\) return;/);
  assert.doesNotMatch(lock, /btnGuide|guide-choice|guide-section/, 'guide controls are not exempt from the lock');
  assert.match(source, /setGuide:next=>\{ui\.guide=next;if\(isLeadSession\(\)\)saveDraft\(\);\}/, 'guide state is only saved by an editing session');
});

test('the guide agrees with the model on every background pattern and on a band divider', () => {
  const variants = catalog.backgrounds.map((b) => ({ label: `pattern ${b.id}`, design: { ...base(), background: b.id } }));
  const band = base();
  band.slides.divider.layout = 'band';
  variants.push({ label: 'band divider', design: band });
  const roleFor = (q) => (['title', 'divider'].includes(q.slide)
    ? (q.field === 'headingColor' ? 'titleText' : 'subtitle')
    : (q.field === 'headingColor' ? 'heading' : 'body'));
  const ids = ['title.background', 'title.heading', 'title.text', 'divider.background', 'divider.heading', 'divider.text', 'cards.heading', 'cards.text', 'video.background', 'video.heading', 'activity.text'];
  for (const { label, design } of variants) {
    for (const id of ids) {
      const q = byId.get(id);
      const { options, more } = optionsFor(catalog, design, q);
      for (const o of [...options, ...more].filter((x) => x.id !== 'inherit')) {
        const issues = Model.contrastIssues(catalog, applyAnswer(catalog, design, q, o.id))
          .filter((i) => i.kind === q.slide && (q.kind === 'background' || i.role === roleFor(q)));
        assert.equal(o.note.startsWith('Hard to read'), issues.length > 0, `${label} ${id} ${o.id}`);
        if (issues.length) assert.ok(o.note.includes(Math.min(...issues.map((i) => i.ratio)).toFixed(1)), `${label} ${id} ${o.id} shows the model's ratio`);
      }
    }
  }
});

test('an Undo mark names the question, so it still finds it after the guide restarts without the team question', () => {
  const first = { ...startGuide(buildQuestions(catalog)), index: 0 };
  const atLayout = { ...first, index: first.ids.indexOf('title.layout') };
  const mark = guideMark(atLayout);
  assert.equal(mark, 'title.layout');
  const restarted = startGuide(buildQuestions(catalog, { teamComplete: true }));
  assert.equal(restarted.ids[indexForMark(restarted, mark)], 'title.layout');
  assert.equal(guideMark({ ...atLayout, on: false }), undefined, 'no mark while the guide is closed');
  assert.equal(indexForMark(restarted, 'not.a.question'), null);
  assert.equal(indexForMark(restarted, 3), 3, 'history saved before this change, with a number, still loads');
  assert.equal(indexForMark(restarted, 99), null);
  assert.equal(indexForMark(null, mark), null);
});

test('the guide survives only when neither the lesson nor the design changes', () => {
  const design = base();
  const changed = { ...base(), background: catalog.backgrounds.find((b) => b.id !== design.background).id };
  assert.equal(keepsGuide({ fromLesson: 'a', toLesson: 'a', fromDesign: design, toDesign: base() }), true);
  assert.equal(keepsGuide({ fromLesson: 'a', toLesson: 'b', fromDesign: design, toDesign: base() }), false);
  assert.equal(keepsGuide({ fromLesson: 'a', toLesson: 'a', fromDesign: changed, toDesign: design }), false);
});

test('both ways of replacing the design decide about the guide with the same rule', () => {
  const source = fs.readFileSync(new URL('../bespoke/builder-app.mjs', import.meta.url), 'utf8');
  const reset = source.slice(source.indexOf('function resetDesignForLesson('), source.indexOf('function applySelectionPayload('));
  const apply = source.slice(source.indexOf('function applySelectionPayload('), source.indexOf('function recordChange('));
  for (const [name, body] of [['resetDesignForLesson', reset], ['applySelectionPayload', apply]]) {
    assert.match(body, /keepsGuide\(/, `${name} uses keepsGuide`);
    assert.doesNotMatch(body, /lessonId!==state\.lessonId\)ui\.guide=null/, `${name} has no lesson-only rule left`);
  }
});
