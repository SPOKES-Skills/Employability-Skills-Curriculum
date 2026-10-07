# BeSpoke PR 1: review fixes and twelve presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish PR 1 of BeSpoke Quick pick: land the eleven fixes left from the October 2 final review, add three presets so there are twelve, and leave the branch ready for a pull request and a service redeploy.

**Architecture:** The October 2 work (sidebar text color, nine presets from one table, builder name, read-only team view links) is already on this branch. This plan adds small, test-first fixes to `bespoke/builder-app.mjs`, `bespoke/team-view.mjs` and the test files, then three more rows in the preset table in `scripts/build-bespoke-presets.mjs`, which regenerates `bespoke/builder-catalog.json` and `bespoke/selection-v2.schema.json`. No saved-design format change except three new `startingPoint` ids.

**Tech Stack:** Static ES modules in `bespoke/`, Node 22 test scripts (`node:test`, Playwright), Python 3 `unittest`, Netlify function staged with `scripts/bespoke-stage-service.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-06-bespoke-quick-pick-design.md` (amended 2026-10-07: advisory input, no readability gates). The fix list comes from `.superpowers/sdd/2026-10-02-bespoke-start-path-presets/final-fix-1.md` in the `bespoke-workflow-presets-fc20df` worktree, quoted in the tasks below.

## Global Constraints

- Quick pick is advisory input. No readability, contrast or accessibility gate, test or warning is added for what a team can pick. The existing checks that the nine October 2 presets raise no advisory stay as they are. The three new presets are exempt.
- `bespoke/builder-app.mjs` is 1,879 lines at the start of this plan. Net growth must stay at 0 to 5 lines. Put new logic in `bespoke/team-view.mjs` when it belongs there. Record the final count.
- Work test-first. Run each new test, watch it fail for the stated reason, then change the code. Quote the red and the green run.
- Commit subjects use `fix:`, `test:`, `feat:` or `docs:`. No attribution trailers. Never use `git add -A`.
- Do not push, open a pull request, run any Netlify command, run the provisioner against a real directory, or write any real secret, code or link anywhere. Britt runs the deploy.
- Prose (docs, comments) has no em dashes, uses plain language and sentence-case headings. Check each prose file with `grep -c $'\xe2\x80\x94' <file>`; expect `0`.
- Every new or changed file stays under 800 lines, except `bespoke/builder-app.mjs` and the two existing test files that are already over, which must not grow by more than 40 lines each.
- Test commands run from the worktree root:
  - Model: `node scripts/test-bespoke-builder-model.mjs`
  - Contracts and view links: `node --test scripts/test-bespoke-team-view.mjs scripts/test-bespoke-provision.mjs scripts/test-bespoke-v2-contracts.mjs scripts/test-bespoke-handoff.mjs`
  - Python: `python3 -m unittest discover -s scripts -p 'test_bespoke*.py'`
  - One browser scenario: `BESPOKE_STREAMLINED_SCENARIO='<part of the scenario name>' node scripts/test-bespoke-streamlined-workflow.mjs`
  - Gate: `bash scripts/quality.sh`

## Review Focus

- A team that reopens the builder link after an administrator replaces the edit code must still see their own design and be able to save. A different lesson must still start a fresh session (Task 1).
- A view code pasted into a builder-style link must never leave the tab in an editing session whose saves all fail (Task 2).
- Opening a backup file in a view tab must survive a reload (Task 3).
- A screen reader user must not hear the "has not saved a design yet" notice announced again on every render (Task 4).
- A preset that exactly matches a released lesson must be caught even when a partial match ranks above it (Task 5).
- The three new presets must open, apply through `applyPreset`, save and validate on the service like the nine (Task 7).

---

### Task 1: A new edit code keeps the open session (fix A1)

**Files:**
- Modify: `scripts/bespoke-dev-server.mjs:129-182` (add `replaceEditCode`)
- Modify: `bespoke/builder-app.mjs:131-145` (`installTeamSession`)
- Test: `scripts/test-bespoke-streamlined-workflow.mjs` (new scenario after `team view link`, near line 262)

**Interfaces:**
- Consumes: `createDevServer`, `hashEditCode`, `LESSON_IDS` already imported in `scripts/bespoke-dev-server.mjs`.
- Produces: `createDevServer(...)` now returns an object that also has `replaceEditCode(code: string): void`. It makes the local service accept `code` as the one edit code for every lesson and stop accepting the previous one. Default behavior is unchanged until it is called.

- [ ] **Step 1: Confirm a green baseline before touching anything**

Run: `node scripts/test-bespoke-builder-model.mjs && python3 -m unittest discover -s scripts -p 'test_bespoke*.py' 2>&1 | tail -3 && BESPOKE_STREAMLINED_SCENARIO='team view link' node scripts/test-bespoke-streamlined-workflow.mjs 2>&1 | tail -3`
Expected: model checks print `PASS`, Python prints `OK`, the browser run prints `1 streamlined workflow scenarios passed; 0 failed.` If anything fails here, stop and report it as a baseline problem. Playwright browsers must be installed; if the browser launch fails, run `npx playwright install chromium` and say so.

- [ ] **Step 2: Add the dev-server method (test support, default unchanged)**

In `scripts/bespoke-dev-server.mjs`, change `const env = {` (line 133) to `let env = {`, then replace the final `return { server, baseUrl, runtimeFile: store.filename, async close() {` line (line 182) so the returned object also carries the method:

```js
  return {
    server, baseUrl, runtimeFile: store.filename,
    // Test support: act like an administrator replacing every team's edit code.
    replaceEditCode(code) { env = { ...env, BESPOKE_TEAM_KEYS: JSON.stringify(Object.fromEntries(LESSON_IDS.map(id => [id, hashEditCode(code)]))) }; },
    async close() { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); await store.flush(); }
  };
```

Keep the rest of the `close()` body exactly as it was on line 182. Run `node --test scripts/test-bespoke-dev-server.mjs`. Expected: PASS (the default behavior is unchanged).

- [ ] **Step 3: Write the failing browser scenario**

In `scripts/test-bespoke-streamlined-workflow.mjs`, directly after the `team view link` scenario closes (the line `  });` after `finally { await context.close(); }`), add:

```js
  await scenario('a replaced edit code keeps the open design without a false conflict', async ({ makePage, server }) => {
    const builder = await makePage();
    await team(builder);
    await builder.locator('#preset-fun').click();
    await save(builder);
    const replacement = 'bespoke-local-preview-replaced-code';
    server.replaceEditCode(replacement);
    await builder.goto('about:blank');
    await builder.goto(`${server.baseUrl}/bespoke/#team=${legacy.lesson.id}.${replacement}`);
    await builder.locator('body[data-access=edit]').waitFor();
    await builder.waitForLoadState('networkidle');
    assert.doesNotMatch(await builder.locator('#fileStatus').innerText(), /newer shared version/, 'the draft equals the shared design, so there is no conflict');
    await save(builder);
    assert.equal((await design(builder)).roles.titleBackground, 'gold', 'the saved Fun design is still the open design');
  });
```

- [ ] **Step 4: Run it and watch it fail**

Run: `BESPOKE_STREAMLINED_SCENARIO='replaced edit code' node scripts/test-bespoke-streamlined-workflow.mjs 2>&1 | tail -12`
Expected: FAIL on the `doesNotMatch` line, with the message text `A newer shared version exists`. Quote this red run in the report.

- [ ] **Step 5: Fix `installTeamSession`**

Replace the whole function (lines 131 to 145 of `bespoke/builder-app.mjs`) with:

```js
  function installTeamSession(lessonId, editCode) {
    teamView.end();
    const sameLesson = Boolean(ui.teamSession) && ui.teamSession.lessonId === lessonId;
    if (!sameLesson) { draftGeneration++; resetPresetConfirmation(); }
    // The same lesson with a new code is the same team's design: keep its revision and baseline, and swap only the code.
    if (!sameLesson) ui.teamSession = { lessonId, editCode, revision: null, savedAt: null, baseSelectionKey: null, pendingSave: null };
    else if (ui.teamSession.editCode !== editCode) ui.teamSession = { ...ui.teamSession, editCode };
    state.editCode = editCode;
    persistTeamSession();
  }
```

Why a new object only when the code changes: other code compares `session !== ui.teamSession` to abandon in-flight work, so the object must stay the same when nothing changed, and must be replaced when the code does.

- [ ] **Step 6: Run the scenario and the neighbors**

Run: `BESPOKE_STREAMLINED_SCENARIO='replaced edit code|team view link|builder name' node scripts/test-bespoke-streamlined-workflow.mjs 2>&1 | tail -4`
Expected: `3 streamlined workflow scenarios passed; 0 failed.`
Then run `BESPOKE_STREAMLINED_SCENARIO='autosave|conflict|Open' node scripts/test-bespoke-builder-browser.mjs 2>&1 | tail -4` if that file honors a filter, otherwise run the whole `node scripts/test-bespoke-builder-browser.mjs` once. Expected: 0 failed.

- [ ] **Step 7: Commit**

```bash
git add scripts/bespoke-dev-server.mjs scripts/test-bespoke-streamlined-workflow.mjs bespoke/builder-app.mjs
git commit -m "fix: a replaced edit code no longer shows a false newer-version warning"
```

---

### Task 2: A view code never opens an editing session (fix A2)

**Files:**
- Modify: `bespoke/builder-app.mjs` (`fetchSharedDesign`, the block after the `!result.ok` return, near line 683)
- Test: `scripts/test-bespoke-streamlined-workflow.mjs` (new scenario)

**Interfaces:**
- Consumes: `forgetTeamSession()`, `teamView.open(value, result)` and `render()` already in `builder-app.mjs`; the Open dialog's view branch (line 997) is the model.
- Produces: no new names.

- [ ] **Step 1: Write the failing scenario**

Add after the scenario from Task 1:

```js
  await scenario('a view code in a builder link opens the read-only view', async ({ makePage }) => {
    const builder = await makePage();
    await team(builder);
    await save(builder);
    const view = await makePage({ hash: `#team=${legacy.lesson.id}.${LOCAL_PREVIEW_VIEW_CODE}` });
    await view.locator('body[data-access=view]').waitFor();
    await view.locator('#btnViewRefresh').waitFor();
    assert.match(await view.locator('#accessBanner').innerText(), /View only/);
    assert.equal(await view.evaluate(() => localStorage.getItem('bespoke-team-session-v2')), null, 'no editing session is stored');
    assert.equal(await view.evaluate(() => localStorage.getItem('bespoke-draft-v2')), null, 'no browser draft is written');
  });
```

If the last assertion fails on the green run only because every page writes a default draft on load, read the same value from a page opened with no hash, compare the two, and note this in the report. Do not weaken the first two assertions.

- [ ] **Step 2: Run it and watch it fail**

Run: `BESPOKE_STREAMLINED_SCENARIO='view code in a builder link' node scripts/test-bespoke-streamlined-workflow.mjs 2>&1 | tail -10`
Expected: FAIL waiting for `body[data-access=view]` (the tab opens as an editing session today).

- [ ] **Step 3: Fix `fetchSharedDesign`**

Read lines 672 to 690 first. Directly after the existing `if (!result.ok) { ... return false; }` block and before `if (result.selection) {`, insert:

```js
      if (result.access === "view") {
        const { lessonId, editCode } = session;
        forgetTeamSession();
        await teamView.open(lessonId + "." + encodeURIComponent(editCode), result);
        render();
        return false;
      }
```

- [ ] **Step 4: Run it and the neighbors**

Run: `BESPOKE_STREAMLINED_SCENARIO='view code in a builder link|team view' node scripts/test-bespoke-streamlined-workflow.mjs 2>&1 | tail -4`
Expected: all matching scenarios pass, 0 failed.

- [ ] **Step 5: Commit**

```bash
git add bespoke/builder-app.mjs scripts/test-bespoke-streamlined-workflow.mjs
git commit -m "fix: a view code in a builder link opens the read-only view"
```

---

### Task 3: Opening a backup in a view tab ends the view session (fix A3)

**Files:**
- Modify: `bespoke/builder-app.mjs` (`openTeamFile`, the no-session branch near lines 398-401)
- Test: `scripts/test-bespoke-streamlined-workflow.mjs`

**Interfaces:**
- Consumes: `teamView.end()` (already used at lines 132 and 509); test helpers `backup(page)` and `upload(page, value, name)`.
- Produces: no new names.

- [ ] **Step 1: Write the failing scenario**

Check what `backup(page)` returns (it ends with `return value;`; if it does not, make the test read the downloaded value the same way). Add:

```js
  await scenario('opening a backup in a view tab survives a reload', async ({ makePage }) => {
    const builder = await makePage();
    await team(builder);
    await builder.locator('#preset-fun').click();
    await save(builder);
    const value = await backup(builder);
    const view = await makePage({ hash: viewHash() });
    await view.locator('#btnViewRefresh').waitFor();
    await upload(view, value, 'backup.json');
    assert.equal(await viewSession(view), null, 'opening a backup ends the view session');
    await view.reload();
    await view.locator('#stepList button').first().waitFor();
    assert.notEqual(await view.locator('body').getAttribute('data-access'), 'view', 'a reload does not flip the tab back to View only');
    assert.equal((await design(view)).roles.titleBackground, 'gold', 'the backup design is still open');
  });
```

- [ ] **Step 2: Run it and watch it fail**

Run: `BESPOKE_STREAMLINED_SCENARIO='backup in a view tab' node scripts/test-bespoke-streamlined-workflow.mjs 2>&1 | tail -10`
Expected: FAIL on the `viewSession` assertion (the key is still set).

- [ ] **Step 3: Fix `openTeamFile`**

Read lines 386 to 410. In the branch `if (!ui.teamSession) {` that sets `ui.mode = "edit"` and `state.editCode = ""`, add one line `teamView.end();` as its first statement:

```js
      if (!ui.teamSession) {
        teamView.end();
        ui.mode = "edit";
        state.editCode = "";
      }
```

- [ ] **Step 4: Run it and the neighbors**

Run: `BESPOKE_STREAMLINED_SCENARIO='backup|team view' node scripts/test-bespoke-streamlined-workflow.mjs 2>&1 | tail -4`
Expected: 0 failed.

- [ ] **Step 5: Commit**

```bash
git add bespoke/builder-app.mjs scripts/test-bespoke-streamlined-workflow.mjs
git commit -m "fix: opening a backup in a view tab ends the view session"
```

---

### Task 4: The restore notice is written only when it changes (fix A4)

**Files:**
- Modify: `bespoke/builder-app.mjs:243-247`
- Test: `scripts/test-bespoke-streamlined-workflow.mjs`

**Interfaces:**
- Consumes: the `team view banner is written once` scenario (near line 273) as the pattern.
- Produces: no new names.

- [ ] **Step 1: Write the failing scenario**

```js
  await scenario('the team view notice is written once', async ({ makePage }) => {
    const view = await makePage({ hash: viewHash('goal-setting') });
    await view.locator('#restoreNotice').filter({ hasText: 'has not saved a design yet' }).waitFor();
    await view.evaluate(() => {
      window.noticeWrites = 0;
      new MutationObserver(records => { window.noticeWrites += records.length; }).observe(document.querySelector('#restoreNotice'), { childList: true, characterData: true, attributes: true, subtree: true });
    });
    await stage(view, 'start'); await stage(view, 'slides');
    await view.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));
    assert.equal(await view.evaluate(() => window.noticeWrites), 0, 'renders that change nothing leave the live notice alone');
  });
```

- [ ] **Step 2: Run it and watch it fail**

Run: `BESPOKE_STREAMLINED_SCENARIO='notice is written once' node scripts/test-bespoke-streamlined-workflow.mjs 2>&1 | tail -10`
Expected: FAIL with `noticeWrites` greater than 0.

- [ ] **Step 3: Fix the render code**

Replace lines 243 to 247 (`const notice = byId("restoreNotice"); if (notice) { ... }`) with:

```js
    const notice = byId("restoreNotice");
    if (notice) {
      const hidden = !ui.restoreNote, text = ui.restoreNote || "";
      if (notice.hidden !== hidden) notice.hidden = hidden;
      if (notice.textContent !== text) notice.textContent = text;
    }
```

- [ ] **Step 4: Run it and the neighbors; check the file size**

Run: `BESPOKE_STREAMLINED_SCENARIO='notice|team view' node scripts/test-bespoke-streamlined-workflow.mjs 2>&1 | tail -4 && wc -l bespoke/builder-app.mjs`
Expected: 0 failed, and `bespoke/builder-app.mjs` at 1,884 lines or fewer. If it is over, tighten the Task 1 and Task 4 edits before committing.

- [ ] **Step 5: Commit**

```bash
git add bespoke/builder-app.mjs scripts/test-bespoke-streamlined-workflow.mjs
git commit -m "fix: write the team view notice only when it changes"
```

---

### Task 5: Close three test gaps (fixes B1, B2, B3)

**Files:**
- Modify: `scripts/test-bespoke-builder-model.mjs:39-55` (B1)
- Modify: `scripts/test-bespoke-provision.mjs` (B2, new test after line 211)
- Modify: `scripts/test_bespoke_v2.py` (B3, new test method)

**Interfaces:**
- Consumes: `compareDesign(fingerprints, design, catalog)` returns an array ranked by shared count, each item has `title`, `shared`, `total`. `provision`, `provisionViewLinks`, `rotateTeamCodes`, `root`, `NOW` already exist in the provisioning test file. `build_design`, `require_valid_selection`, `self.catalog`, `self.payload` exist in `test_bespoke_v2.py`.
- Produces: no new names.

- [ ] **Step 1 (B1): Show the old check can miss an exact match**

Run this scratch check (it writes nothing to the repo):

```bash
node -e "
const ranked=[{title:'partial',shared:5,total:9},{title:'exact small',shared:3,total:3}];
const near=ranked[0];
console.log('old check passes:', near.shared < near.total);
console.log('new check finds:', ranked.find(r=>r.shared===r.total)?.title);
"
```
Expected: `old check passes: true` and `new check finds: exact small`. This is the red demonstration; quote it. A direct red run on the real catalog is not practical because no real preset matches a lesson.

- [ ] **Step 2 (B1): Change the check**

In `scripts/test-bespoke-builder-model.mjs`, replace these lines inside the `for (const item of catalog.presets)` loop of the check named `nine presets differ from each other and from the released lessons`:

```js
    const near = compareDesign(fingerprints, item.design, catalog)[0];
    assert(near.shared < near.total, `${item.id} is an exact match for ${near.title}`);
```

with:

```js
    const ranked = compareDesign(fingerprints, item.design, catalog);
    const near = ranked[0];
    const exact = ranked.find(result => result.shared === result.total);
    assert.equal(exact, undefined, `${item.id} is an exact match for ${exact?.title}`);
```

Keep the `console.log` line that prints the closest lesson. Run `node scripts/test-bespoke-builder-model.mjs`. Expected: all `PASS`.

- [ ] **Step 3 (B2): Add the plain-case refusal test**

In `scripts/test-bespoke-provision.mjs`, after the test `provisioning refuses repository paths and insecure or credential-bearing URLs` (ends near line 214), add:

```js
test('every provisioning function refuses an output directory inside the repository, on any file system', () => {
  const wizardUrl = 'https://example.test/bespoke/';
  const inside = path.join(root, 'scripts', 'refused-provision-output');
  for (const run of [
    () => provision({ output: inside, wizardUrl }),
    () => provisionViewLinks({ output: inside, wizardUrl }),
    () => rotateTeamCodes({ output: inside, wizardUrl, now: NOW })
  ]) assert.throws(run, /outside this repository/);
  assert.equal(fs.existsSync(inside), false, 'a refused run creates nothing, so no secret lands in the repository');
});
```

- [ ] **Step 4 (B2): Prove it can fail, then restore**

The refusal already works, so the test passes first. Prove it has teeth by temporarily removing the guard from one function. In `scripts/bespoke-provision.mjs`, find the `refuseRepository(...)` call inside `provisionViewLinks` (line 66 onward) and comment it out. Run `node --test scripts/test-bespoke-provision.mjs`. Expected: the new test FAILS (and the failed run may have created `scripts/refused-provision-output`; delete that directory with `rm -rf scripts/refused-provision-output`). Restore the line with `git checkout scripts/bespoke-provision.mjs`, then rerun. Expected: all pass. Quote both runs.

- [ ] **Step 5 (B3): Add the build contract test**

In `scripts/test_bespoke_v2.py`, add this method inside `V2SubmissionTests` after `test_low_contrast_choices_generate_exact_artifacts_with_nonblocking_advisories`:

```python
    def test_sidebar_text_and_builder_reach_the_build_contract(self):
        preset = next(item for item in self.catalog["presets"] if item["id"] == "gold-standard")
        self.payload["design"] = deepcopy(preset["design"])
        self.payload["team"]["builder"] = {"name": "Dana Builder"}
        self.assertEqual(self.payload["design"]["roles"]["sidebarText"], "gold")
        require_valid_selection(self.payload)
        css, contract = build_design(self.payload)
        self.assertEqual(contract["design"]["roles"]["sidebarText"], "gold")
        self.assertRegex(css, r"--role-sidebar-ink:\s*var\(--gold\)")
```

Run `python3 -m unittest scripts.test_bespoke_v2 -v 2>&1 | tail -8` (or `python3 -m unittest discover -s scripts -p 'test_bespoke_v2.py'`). If the CSS pattern differs from what `cssForDesign` emits, read the generated `css` and change only the regex to match the real variable form, not the assertion's meaning.

- [ ] **Step 6 (B3): Prove it can fail, then restore**

The behavior already exists, so prove the test has teeth. Temporarily change line 31 of `bespoke/builder-model.mjs` from `return design.roles.sidebarText || inkFor(catalog, design.roles.sidebar);` to `return inkFor(catalog, design.roles.sidebar);`. Run the new test. Expected: FAIL on the `--gold` regex. Restore with `git checkout bespoke/builder-model.mjs`, rerun. Expected: pass. Quote both runs.

- [ ] **Step 7: Commit**

```bash
git add scripts/test-bespoke-builder-model.mjs scripts/test-bespoke-provision.mjs scripts/test_bespoke_v2.py
git commit -m "test: check exact lesson matches across all results, repository refusals on any file system, and sidebar text in the build contract"
```

---

### Task 6: Docs corrections (fixes C1 to C4)

**Files:**
- Modify: `docs/bespoke/decisions.md` (C1, row at line 22)
- Modify: `docs/bespoke/auto-handoff-setup.md` (C2)
- Modify: `bespoke/team-guide.html` (C3, lines 22, 58, 77)
- Modify: `docs/superpowers/specs/2026-10-02-bespoke-start-path-presets-design.md` (C4, line 323)

**Interfaces:** none.

Prose rules: plain language for an administrator who is not a developer, short sentences, no em dashes, sentence-case headings, no site ID, private path, real link or code.

- [ ] **Step 1 (C1): decisions.md**

Replace the row at line 22 so its right-hand cell reads: `A four-screen intake wizard (lesson team, Team Leader, who is building, how the team works), then scratch or preset. Replaced on 2026-10-06 by Quick pick; see the October 7 entry above.` Keep the left cell and the table format. Run `grep -c $'\xe2\x80\x94' docs/bespoke/decisions.md` and compare with the count before your edit. The count must not rise. (Older entries may already hold some; do not rewrite them.)

- [ ] **Step 2 (C2): auto-handoff-setup.md**

Read the whole file once. Then make these edits, keeping every other line:
1. Lines 132 to 134: delete the sentence that cites commit `e70b95d`. Replace it with: `A view-env.json made before view codes got their view: prefix will not work. Regenerate it.`
2. Same area and line 243: where it says to delete the three `view-*` files before regenerating, say instead: `Move the three view-* files aside first. Delete them once the new run has succeeded.`
3. In "Add team view links", add one line: `Pinning a view link does not switch off a builder link that was already pinned or shared. Unpin the builder link. If it reached people who should not edit, see Replace the edit codes.`
4. In "Replace the edit codes", add: `Do this as its own service deploy after the page change is live. In the same sitting, hand out the new builder links, unpin the old ones and pin the view links, because the old builder links stop working at that deploy.`
5. Lines 170 to 173, where builder links are said to be in `team-links.html`: add `After a rotation, the dated team-links-<stamp>.html and team-access-<stamp>.json are the current ones.`
6. Line 188, "three schema/catalog authority files": open `scripts/bespoke-stage-service.mjs`, list what it copies, and write the true list in place of that phrase.
7. Near the provisioning commands add: `The --add-view-links and --rotate-team-codes modes exist from this release on, so run the provisioner from a checkout that has it.`
8. Before the first provisioning command (near line 69 to 78) add a one-sentence lead-in saying what the command creates, for example `Run this once to create the access files and the six builder links.`

- [ ] **Step 3 (C3): team-guide.html**

At lines 22, 58 and 77 change the wording so the builder does the editing and shares their screen, for example line 22 becomes `<li>Choose one person to build. They edit BeSpoke and share their browser window in Teams.</li>`, line 77's footer starts `The builder edits during the call.`, and line 58 says `Check that the Team Leader's name is filled in` in place of `the spokesperson's name`. Line 30's last sentence, `Let the spokesperson save the agreed design.`, becomes `Let the builder save the agreed design.` Keep all other lines. Then run `grep -n 'DESIGN.md' /dev/null; grep -nEi 'preset' bespoke/DESIGN.md | head` and, if DESIGN.md still counts presets, change the count to twelve in Task 7 (not here).

- [ ] **Step 4 (C4): the October 2 spec**

At line 323 change `- The live view link and builder link both work.` and its check so it reads: check `Britt opens one builder link after the deploy, and one team view link after the merge, because the live page is served from main.` Then run `instruction-lint docs/superpowers/specs/2026-10-02-bespoke-start-path-presets-design.md`. Expected: no FAIL line. If the tool reports FAILs that existed before your edit, note them and do not fix unrelated ones.

- [ ] **Step 5: Verify and commit**

Run: `grep -c $'\xe2\x80\x94' docs/bespoke/auto-handoff-setup.md bespoke/team-guide.html` and compare with the counts from `git show HEAD:<file> | grep -c $'\xe2\x80\x94'`. Counts must not rise.

```bash
git add docs/bespoke/decisions.md docs/bespoke/auto-handoff-setup.md bespoke/team-guide.html docs/superpowers/specs/2026-10-02-bespoke-start-path-presets-design.md
git commit -m "docs: correct the setup guide, team guide, decisions row and October 2 check from the final review"
```

---

### Task 7: Three new presets, twelve in all

**Files:**
- Modify: `scripts/build-bespoke-presets.mjs` (add three rows, update the header comment)
- Regenerate: `bespoke/builder-catalog.json`, `bespoke/selection-v2.schema.json`
- Modify: `scripts/test-bespoke-builder-model.mjs:26-60`
- Modify: `scripts/test-bespoke-v2-contracts.mjs:27-34`
- Modify: `scripts/test-bespoke-builder-browser.mjs:194`
- Modify: `bespoke/README.md:20`, `bespoke/DESIGN.md` (preset count if it appears)
- Modify: `docs/superpowers/specs/2026-10-06-bespoke-quick-pick-design.md` (two small follow-ups, Step 8)

**Interfaces:**
- Consumes: `PRESETS` table shape in `scripts/build-bespoke-presets.mjs`: `roles(sidebar, titleBackground, titleBackgroundEnd, titleText, subtitle, contentBackground, heading, body, accent, button, dividerBackground)`, `fonts: [heading, body]`, `background`, `slides(title, divider, cards, video, activity)`.
- Produces: preset ids `harvest`, `bold-statement`, `fresh-start`, accepted as `startingPoint` by `applyPreset`, `SCHEMA_V2` and the service.

- [ ] **Step 1: Write the failing test changes first**

In `scripts/test-bespoke-builder-model.mjs`:

1. Rename the check `default and nine editable brand presets are valid and independent copies` to `default and twelve editable brand presets are valid and independent copies`. Add `const NINE = ['professional', 'modern', 'serious', 'light-hearted', 'fun', 'outspoken', 'open-air', 'gold-standard', 'slate'];` just above it. Inside its loop, keep `validateDesign` for every preset, and run the `contrastIssues` assertion only when `NINE.includes(item.id)`.
2. In the check `nine presets differ ...`: rename to `twelve presets differ ...`; change the expected id list to the nine ids followed by `'harvest', 'bold-statement', 'fresh-start'`; change `.size, 9, 'title background and title text pairs are unique'` to `.size, 12`; in the final `for (const item of catalog.presets)` loop run the `contrastIssues` assertion only for `NINE.includes(item.id)`; and after the pairwise loop add:

```js
  assert.equal(new Set(designs.map(d => d.fonts.heading)).size, 12, 'every preset has its own heading font');
  const sidebars = designs.map(d => d.roles.sidebar);
  for (const color of new Set(sidebars)) assert(sidebars.filter(c => c === color).length <= 2, `${color} is the sidebar of more than two presets`);
  console.log('  sidebar colors:', JSON.stringify(Object.fromEntries([...new Set(sidebars)].map(c => [c, sidebars.filter(x => x === c).length]))));
```

In `scripts/test-bespoke-v2-contracts.mjs` change `assert.equal(catalog.presets.length, 9);` to `12` and the id list on the next line to `['open-air', 'gold-standard', 'slate', 'harvest', 'bold-statement', 'fresh-start']`, and rename the test to `all twelve preset ids are accepted as a starting point`. In `scripts/test-bespoke-builder-browser.mjs:194` change the expected count `9` to `12`.

- [ ] **Step 2: Run the tests and watch them fail**

Run: `node scripts/test-bespoke-builder-model.mjs 2>&1 | tail -6; node --test scripts/test-bespoke-v2-contracts.mjs 2>&1 | tail -8`
Expected: the model check fails on the id list (nine presets, twelve expected) and the contracts test fails on the preset count. Quote both.

- [ ] **Step 3: Add the three rows to the table**

In `scripts/build-bespoke-presets.mjs`, change the header comment to `/** The twelve starting looks, as one table. Writes them into the builder catalog; --check only compares. */`. Replace the closing of the `PRESETS` array (the `slate` row's final `]` line) so the `slate` row ends with a comma and three rows follow:

```js
  { id: 'harvest', label: 'Harvest', blurb: 'Warm deep gold and mauve with one large box.',
    roles: roles('mauve', 'muted-gold', 'mauve', 'light', 'light', 'muted', 'muted-gold', 'royal', 'gold', 'mauve', 'muted-gold'), fonts: ['source-sans-3', 'vollkorn'], background: 'crosshatch',
    slides: slides(['left', 'corner', 'gradient'], ['number', 'show', 'solid'], ['1', true, 'paragraph', 'filled', 'rows'], ['banner', 'accent', 'large'], ['box', 'heading']) },
  { id: 'bold-statement', label: 'Bold Statement', blurb: 'Navy and bright blue with gold type and split panels.',
    roles: roles('primary', 'dark', 'primary', 'gold', 'light', 'light', 'royal', 'dark', 'gold', 'royal', 'primary'), fonts: ['inter', 'crimson-pro'], background: 'diagonal',
    slides: slides(['split', 'above', 'solid'], ['left', 'hide', 'gradient'], ['4', false, 'numbered', 'filled', 'grid'], ['side', 'plain', 'caps'], ['banner', 'pill']) },
  { id: 'fresh-start', label: 'Fresh Start', blurb: 'Airy mist and green with a left-aligned title.',
    roles: roles('offwhite', 'muted', 'accent', 'dark', 'dark', 'light', 'accent', 'gray', 'accent', 'accent', 'accent'), fonts: ['fira-sans', 'source-sans-3'], background: 'soft-gradient',
    slides: slides(['left', 'above', 'gradient'], ['number', 'hide', 'gradient'], ['3', false, 'bullets', 'rail', 'rows'], ['banner', 'plain', 'regular'], ['side', 'caps']) }
];
```

(Keep exactly one `];` closing the array.)

- [ ] **Step 4: Regenerate the catalog and the schema**

Run: `node scripts/build-bespoke-presets.mjs && node scripts/generate-selection-v2-schema.mjs && node scripts/build-bespoke-presets.mjs --check && node scripts/generate-selection-v2-schema.mjs --check; echo exit=$?`
Expected: `exit=0`. `git diff --stat` then shows only `bespoke/builder-catalog.json` and `bespoke/selection-v2.schema.json` changed beyond your edits.

- [ ] **Step 5: Run the tests and fix preset values if a check fails**

Run: `node scripts/test-bespoke-builder-model.mjs 2>&1 | tail -30`
Expected: all `PASS`, the printed closest-lesson line for each of the twelve, and the sidebar counts line. If a preset fails `validateDesign` (for example a text box count of `1` that the catalog refuses a `layout` for), read the error and change only that preset's value, then rerun Steps 4 and 5. If two presets differ on fewer than 7 of 13 fields, change one of the new preset's choices (a layout, texture or sidebar) to a value that fewer presets use, rerun, and note the change in the report. Do not weaken the checks.

- [ ] **Step 6: Run the rest of the affected suites**

Run: `node --test scripts/test-bespoke-v2-contracts.mjs scripts/test-bespoke-handoff.mjs 2>&1 | tail -8; python3 -m unittest discover -s scripts -p 'test_bespoke*.py' 2>&1 | tail -3; node scripts/test-bespoke-builder-browser.mjs 2>&1 | tail -4`
Expected: all pass, 0 failed. Then `grep -rnE "\\b(nine|9) (starting |editable |brand )?presets?\\b|presets.*\\b9\\b" scripts bespoke/README.md bespoke/DESIGN.md bespoke/team-guide.html docs/bespoke/builder-handoff.md | grep -v test-fixtures` and update any remaining count that refers to the current catalog (not history) to twelve. In `bespoke/README.md` line 20 change `one of nine` to `one of twelve`.

- [ ] **Step 7: Look at the three new presets rendered**

Start the local preview with `node scripts/bespoke-dev-server.mjs` in the background (never attach to the persistent preview), open it with the browser tools, apply each new preset, and take a screenshot of the title slide and a content slide for each into the scratchpad directory. Do not commit screenshots. Stop the server afterward. The goal is a quick look, not a gate: ugly is acceptable, a broken layout (overlap, empty slide, missing font) is not.

- [ ] **Step 8: Spec follow-ups**

In `docs/superpowers/specs/2026-10-06-bespoke-quick-pick-design.md`:
1. The Selected state paragraph says every preset has its own `accent` and `button` pair and the match is exact. Two of the nine share a pair. Replace those two sentences with: `Where two presets share the pair, the first one in the preset list is shown as selected. That is fine, because the saved scheme in the draft is the real source and this fallback only matters on another computer.` In the variety checks list, delete the bullet `Every preset has its own accent and button pair, ...`.
2. In the Both pull requests section, change `1,879 lines or fewer after PR 2` to the line count `wc -l bespoke/builder-app.mjs` reports now, and say `the count at the end of PR 1`.
Run `grep -c $'\xe2\x80\x94'` on the spec. Expected `0`.

- [ ] **Step 9: Commit**

```bash
git add scripts/build-bespoke-presets.mjs bespoke/builder-catalog.json bespoke/selection-v2.schema.json scripts/test-bespoke-builder-model.mjs scripts/test-bespoke-v2-contracts.mjs scripts/test-bespoke-builder-browser.mjs bespoke/README.md bespoke/DESIGN.md docs/superpowers/specs/2026-10-06-bespoke-quick-pick-design.md
git commit -m "feat: add Harvest, Bold Statement and Fresh Start, twelve presets in all"
```

(Drop any file from `git add` that did not change.)

---

### Task 8: Gate, stage the service, and hand off

**Files:**
- Create (outside the repo): a staged service package under `~/bespoke-stages/`
- Modify: `.claude/MEMORY.md` (project state)

**Interfaces:** none.

- [ ] **Step 1: Run the whole gate once**

Run: `bash scripts/quality.sh 2>&1 | tail -15`
Expected: exit code 0 and `quality.sh: all checks passed`. Quote the tail. If it fails, fix the cause (not the test) and rerun; do not commit around a failing gate.

- [ ] **Step 2: Check the finish line**

Run: `wc -l bespoke/builder-app.mjs bespoke/team-view.mjs; git log --oneline origin/main..HEAD | wc -l; git status --short | head`
Expected: `builder-app.mjs` at 1,884 lines or fewer, a clean tree, and the commit list printed for the report.

- [ ] **Step 3: Stage the service from a clean checkout of this head**

```bash
SHA=$(git rev-parse --short HEAD)
STAGE="$HOME/bespoke-stages/2026-10-07-pr1-$SHA"
mkdir -p "$STAGE.src" && git archive HEAD | tar -x -C "$STAGE.src"
(cd "$STAGE.src" && node scripts/bespoke-stage-service.mjs "$STAGE")
```
Then byte-compare every staged file with the branch, quoting paths because `SPOKES Builder/` has a space:

```bash
(cd "$STAGE" && find . -type f -print0 | while IFS= read -r -d '' f; do cmp -s "$f" "$OLDPWD/$f" || echo "DIFFERS: $f"; done); echo compare-done
```
Expected: no `DIFFERS:` lines, then `compare-done`. Remove the temporary `$STAGE.src` directory afterwards.

- [ ] **Step 4: Update project memory**

In `.claude/MEMORY.md`, set the Current Status and Last Session to today's date (2026-10-07) with: the guided builder, preview editor and nine presets are in or ahead of main; PR 1 (fixes, twelve presets) is built on branch `claude/bespoke-simplify-choices-02762b` and not pushed; the Quick pick spec and this plan; the advisory decision (auto-memory file `bespoke-is-advisory-not-final.md` holds the durable rule); Britt's deploy is the next step. Keep the existing Open Items. Run `sed -n '/## Last Session/,/## Open Items/p' .claude/MEMORY.md` and confirm the date line says 2026-10-07. Commit with `git add .claude/MEMORY.md` and `git commit -m "docs: record PR 1 progress in project memory"`.

- [ ] **Step 5: Stop and report. Do not push.**

Report to Britt: the commit list, the quality gate tail, the staged package path and the Netlify command from the deploy memory (Britt runs it), the steps for `BESPOKE_VIEW_KEYS` (a new Netlify setting, from `view-env.json`), a request to review the three new presets, and the question of whether to push the branch and open the pull request. Pushing and opening the PR wait for Britt's go-ahead.

---

## Self-review

- **Spec coverage:** PR 1 in the spec is the October 2 work plus the three presets and tests, with the A1 to A4 fixes. Tasks 1 to 4 cover A1 to A4, Task 5 covers B1 to B3, Task 6 covers C1 to C4, Task 7 covers the three presets, the schema, the tests and the spec follow-ups, Task 8 covers the gate, the staged service, the redeploy handoff and memory. Not in this plan, by design: Quick pick itself (PR 2).
- **Placeholders:** the only open reads are named steps with a decision rule (Task 2 draft assertion, Task 5 CSS regex, Task 6 doc anchors, Task 7 preset value fixes). Each says what to read, what to change and what to report.
- **Names:** `replaceEditCode` is defined in Task 1 Step 2 and used in Step 3. Preset ids `harvest`, `bold-statement`, `fresh-start` match across the table, the tests and the contracts test. `NINE` is defined and used only in Task 7.
- **Review Focus:** each line has a test: Task 1 (code swap, plus the existing different-lesson scenarios), Task 2, Task 3, Task 4, Task 5 Step 1, Task 7 Step 1.
