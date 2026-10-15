import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { handleRequest, hashEditCode } from "../netlify/functions/bespoke-handoff.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const types = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".png":"image/png", ".woff2":"font/woff2" };
const accessCode = "team-access-code-1234567890";
const env = {
  BESPOKE_GITHUB_TOKEN: "test-token-not-a-real-secret",
  BESPOKE_DRAFT_KEY: Buffer.alloc(32, 7).toString("base64"),
  BESPOKE_TEAM_KEYS: JSON.stringify({ "money-management": hashEditCode(accessCode) })
};

function createMemoryGitHub() {
  const current = new Map(), blobs = new Map(), versions = new Map(), writes = [];
  let serial = 0, dispatched = null;
  return {
    writes,
    get dispatched() { return dispatched; },
    async readDraft(id) { return current.get(id) || null; },
    async writeDraft(id, envelope, revision) {
      const existing = current.get(id);
      if ((existing?.sha || null) !== (revision || null)) throw Object.assign(new Error("conflict"), { status:409 });
      const sha = (++serial).toString(16).padStart(40, "0");
      const item = { sha, envelope };
      current.set(id, item); blobs.set(sha, item);
      versions.set(id, [item, ...(versions.get(id) || [])]);
      writes.push({ lessonId:id, sha, revision:revision || null });
      return sha;
    },
    async readDraftRevision(id, revision) {
      const item = blobs.get(revision);
      return item?.envelope.lessonId === id ? item : null;
    },
    async listDraftHistory(id, limit) { return (versions.get(id) || []).slice(0, limit); },
    async findProposal(id, receipt) {
      return dispatched?.lessonId === id && dispatched?.receipt === receipt
        ? { url:"https://example.test/proposal/1", number:1 } : null;
    },
    async findRun(id, receipt) {
      if (dispatched?.lessonId === id && dispatched?.receipt === receipt) {
        dispatched.statusChecks += 1;
        return { id:101, status:"in_progress", conclusion:null, updatedAt:new Date().toISOString() };
      }
      return null;
    },
    async dispatchSpokeSignal(payloadJson, lessonId, receipt) {
      dispatched = { payloadJson, lessonId, receipt, statusChecks:0 };
      return { id:101 };
    }
  };
}

const github = createMemoryGitHub();
const seenMutations = new Map();
const stalledMutations = new Set();
const apiActions = [];
let apiBase = "", staticBase = "";

async function bodyBuffer(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

const apiServer = http.createServer(async (req, res) => {
  const raw = req.method === "OPTIONS" ? Buffer.alloc(0) : await bodyBuffer(req);
  let body = null;
  try { body = raw.length ? JSON.parse(raw.toString("utf8")) : null; } catch {}
  if (body?.action) apiActions.push(body.action);
  const mutationId = body?.mutationId;
  if (mutationId) seenMutations.set(mutationId, (seenMutations.get(mutationId) || 0) + 1);
  if (body?.action === "save" && body?.selection?.team?.name === "Stalled request version" && !stalledMutations.has(mutationId)) {
    stalledMutations.add(mutationId);
    await new Promise(resolve => res.once("close", resolve));
    return;
  }
  const request = new Request(apiBase + req.url, { method:req.method, headers:req.headers, ...(raw.length ? { body:raw } : {}) });
  const response = await handleRequest(request, env, { github });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (body?.action === "save" && body?.selection?.team?.name === "Lost response version" && seenMutations.get(mutationId) <= 2) {
    req.socket.destroy();
    return;
  }
  if (body?.action === "save" && body?.selection?.team?.name === "Delayed version") {
    await new Promise(resolve => setTimeout(resolve, 450));
  }
  res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
  res.end(bytes);
});
await new Promise(resolve => apiServer.listen(0, "127.0.0.1", resolve));
apiBase = "http://127.0.0.1:" + apiServer.address().port + "/api/bespoke";

const staticServer = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (pathname === "/bespoke/handoff-config.json") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ apiBase }));
      return;
    }
    const target = path.resolve(root, "." + pathname + (pathname.endsWith("/") ? "index.html" : ""));
    if (!target.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    const data = await fs.readFile(target);
    res.setHeader("Content-Type", types[path.extname(target)] || "application/octet-stream");
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => staticServer.listen(0, "127.0.0.1", resolve));
staticBase = "http://127.0.0.1:" + staticServer.address().port + "/bespoke/legacy.html";
const teamUrl = staticBase + "#team=money-management." + accessCode;

const browser = await chromium.launch({ headless:true });
const errors = [];
let passed = 0;
function ok(name) { passed += 1; console.log("PASS " + name); }
async function ready(page, url = staticBase) {
  page.on("pageerror", error => errors.push(error.message));
  page.on("dialog", dialog => dialog.accept());
  await page.goto(url);
  await page.locator("#stepList button").first().waitFor();
  return page;
}
async function gotoTeam(page) {
  await page.getByRole("button", { name:/Step 2 of .*Lesson & team/ }).click();
  await page.locator("#teamName").waitFor();
}
async function setTeamName(page, value) {
  await gotoTeam(page);
  await page.locator("#teamName").fill(value);
}
async function saveShared(page) {
  await page.locator("#btnSave").click();
  await page.locator("#fileStatus").filter({ hasText:/Shared design saved|already up to date|version that started saving/ }).waitFor({ timeout:10000 });
}
async function newContext(options = {}, autosave = { enabled:false }) {
  const context = await browser.newContext(options);
  await context.addInitScript(settings => { window.__bespokeAutosave = settings; }, autosave);
  return context;
}
async function waitForWrites(count, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (github.writes.length < count && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(github.writes.length, count);
}
async function sharedTeamName() {
  const context = await newContext({ reducedMotion:"reduce" });
  const page = await ready(await context.newPage(), teamUrl);
  await page.locator("#fileStatus").filter({ hasText:"Opened the latest shared design" }).waitFor();
  await gotoTeam(page);
  const name = await page.locator("#teamName").inputValue();
  await context.close();
  return name;
}
async function downloadBackup(page) {
  const event = page.waitForEvent("download");
  await page.locator("#btnDownloadBackup").click();
  const download = await event;
  return { name:download.suggestedFilename(), buffer:await fs.readFile(await download.path()) };
}
async function editorLayout(page) {
  return page.evaluate(() => {
    const rect = selector => document.querySelector(selector).getBoundingClientRect();
    const workspace = rect("#workspace");
    const stepper = rect(".stepper");
    const panel = rect("#stepPanel");
    return {
      workspace:{ top:workspace.top, bottom:workspace.bottom, height:workspace.height },
      stepper:{ top:stepper.top, bottom:stepper.bottom, height:stepper.height },
      panel:{ top:panel.top, bottom:panel.bottom, height:panel.height }
    };
  });
}
async function assertPanelControlReachable(page, selector, minPanelHeight) {
  await page.locator(selector).evaluate(element => element.scrollIntoView({ block:"start", inline:"nearest" }));
  await page.evaluate(selector => {
    const box = document.querySelector(selector).getBoundingClientRect();
    const scroller = document.scrollingElement;
    if (box.bottom > innerHeight) scroller.scrollTop += box.bottom - innerHeight + 8;
    else if (box.top < 0) scroller.scrollTop += box.top - 8;
  }, selector);
  await page.waitForTimeout(400);
  const result = await page.evaluate(({ selector, minPanelHeight }) => {
    const workspace = document.querySelector("#workspace").getBoundingClientRect();
    const panel = document.querySelector("#stepPanel").getBoundingClientRect();
    const target = document.querySelector(selector);
    const box = target.getBoundingClientRect();
    const x = Math.max(0, Math.min(innerWidth - 1, box.left + box.width / 2));
    const y = Math.max(panel.top, Math.min(panel.bottom - 1, box.top + box.height / 2));
    const hit = document.elementFromPoint(x, y);
    return {
      enoughPanel:panel.height >= minPanelHeight,
      panelInsideWorkspace:panel.top >= workspace.top && panel.bottom <= workspace.bottom + 1,
      targetInsidePanel:box.top >= panel.top - 1 && box.bottom <= panel.bottom + 1,
      targetInsideViewport:box.top >= 0 && box.bottom <= innerHeight,
      hitTarget:Boolean(hit && (hit === target || target.contains(hit))),
      hit:hit ? { tag:hit.tagName, id:hit.id, className:hit.className } : null,
      panelHeight:panel.height,
      point:{ x, y, innerWidth, innerHeight },
      scrolling:{
        top:document.scrollingElement.scrollTop,
        height:document.scrollingElement.scrollHeight,
        client:document.scrollingElement.clientHeight,
        bodyHeight:document.body.getBoundingClientRect().height,
        htmlOverflow:getComputedStyle(document.documentElement).overflowY,
        bodyOverflow:getComputedStyle(document.body).overflowY
      },
      target:{ top:box.top, bottom:box.bottom, left:box.left, right:box.right, width:box.width },
      panel:{ top:panel.top, bottom:panel.bottom },
      workspace:{ top:workspace.top, bottom:workspace.bottom }
    };
  }, { selector, minPanelHeight });
  assert.deepEqual(
    { enoughPanel:result.enoughPanel, panelInsideWorkspace:result.panelInsideWorkspace, targetInsidePanel:result.targetInsidePanel, targetInsideViewport:result.targetInsideViewport, hitTarget:result.hitTarget },
    { enoughPanel:true, panelInsideWorkspace:true, targetInsidePanel:true, targetInsideViewport:true, hitTarget:true },
    JSON.stringify(result)
  );
}

try {
  const firstContext = await newContext({
    viewport:{width:1280,height:900},
    reducedMotion:"reduce",
    permissions:["clipboard-read", "clipboard-write"]
  });
  const first = await ready(await firstContext.newPage(), teamUrl);
  assert.equal(new URL(first.url()).hash, "");
  await first.locator("#fileStatus").filter({ hasText:"no shared design yet" }).waitFor();
  await gotoTeam(first);
  assert.equal(await first.locator("#lessonSelect").isDisabled(), true);
  assert.equal(await first.locator("#lessonSelect").inputValue(), "money-management");
  await first.locator("#teamName").fill("First shared version");
  await first.locator("#spokespersonName").fill("Team Lead");
  await saveShared(first);
  assert.equal(github.writes.length, 1);
  ok("private access link is removed immediately and locks the assigned lesson");

  await first.waitForTimeout(50);
  const validSessionBefore = await first.evaluate(() => localStorage.getItem("bespoke-team-session-v1"));
  const validDraftBefore = await first.evaluate(() => localStorage.getItem("bespoke-draft-v1"));
  await first.evaluate(() => {
    const select = document.querySelector("#openLesson");
    select.add(new Option("Money Management", "money-management", true, true));
    document.querySelector("#openDialog").showModal();
  });
  const wrongCode = "wrong-access-code-1234567890";
  await first.locator("#openEditCode").fill(wrongCode);
  await first.locator("#openConfirm").click();
  await first.waitForFunction(() => {
    const text = document.querySelector("#openError")?.textContent || "";
    return text && !text.startsWith("Checking");
  });
  assert.match(await first.locator("#openError").textContent(), /not right|not accepted|could not be opened/i);
  assert.equal(await first.locator("#openDialog").getAttribute("open"), "");
  assert.equal(await first.locator("#openEditCode").inputValue(), wrongCode);
  assert.equal(await first.evaluate(() => localStorage.getItem("bespoke-team-session-v1")), validSessionBefore);
  assert.equal(await first.evaluate(() => localStorage.getItem("bespoke-draft-v1")), validDraftBefore);
  await first.locator("#openEditCode").fill(accessCode);
  await first.locator("#openConfirm").click();
  await first.locator("#fileStatus").filter({ hasText:"Opened the latest shared design" }).waitFor();
  assert.equal(await first.locator("#openDialog").isVisible(), false);
  ok("a wrong access code leaves the existing session and draft intact and can be corrected in place");

  await first.evaluate(() => {
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function(key) {
      if (window.__bespokeThrowDraftRead && key === "bespoke-draft-v1") throw new Error("storage read blocked");
      return original.call(this, key);
    };
    window.__bespokeThrowDraftRead = true;
  });
  await first.locator("#btnOpen").click();
  await first.locator("#fileStatus").filter({ hasText:"Opened the latest shared design" }).waitFor();
  await first.evaluate(() => { window.__bespokeThrowDraftRead = false; });
  await first.reload();
  await first.locator("#teamName").waitFor();
  ok("opening a shared design recovers cleanly when browser storage reads fail");

  await gotoTeam(first);
  await first.locator("#teamName").fill("Browser announcement check");
  await first.locator("#saveLive").filter({ hasText:"Browser draft saved" }).waitFor({ timeout:3000 });
  await first.locator("#teamName").fill("First shared version");
  ok("the live announcement identifies a browser draft instead of implying a shared save");

  await first.reload();
  await first.locator("#teamName").waitFor();
  assert.equal(await first.locator("#teamName").inputValue(), "First shared version");
  const returned = await ready(await firstContext.newPage());
  await gotoTeam(returned);
  assert.equal(await returned.locator("#teamName").inputValue(), "First shared version");
  ok("save, reload, and remembered return restore the latest shared design");

  const secondContext = await newContext({ viewport:{width:1280,height:900}, reducedMotion:"reduce" });
  const second = await ready(await secondContext.newPage(), teamUrl);
  await gotoTeam(second);
  assert.equal(await second.locator("#teamName").inputValue(), "First shared version");
  ok("fresh team access opens the latest shared revision automatically");

  const manualContext = await newContext({ reducedMotion:"reduce" });
  const manual = await ready(await manualContext.newPage());
  await manual.locator("#btnOpen").click();
  await manual.locator("#openLesson").selectOption("money-management");
  await manual.locator("#openEditCode").fill(accessCode);
  await manual.locator("#openConfirm").click();
  await manual.locator("#fileStatus").filter({ hasText:"Opened the latest shared design" }).waitFor();
  await gotoTeam(manual);
  assert.equal(await manual.locator("#lessonSelect").isDisabled(), true);
  await manual.locator("#btnLeaveSession").click();
  await manual.waitForLoadState("load");
  assert.deepEqual(await manual.evaluate(() => ({
    session:localStorage.getItem("bespoke-team-session-v1"),
    draft:localStorage.getItem("bespoke-draft-v1"),
    backup:localStorage.getItem("bespoke-previous-draft-v1")
  })), { session:null, draft:null, backup:null });
  ok("manual Open accepts administrator access and Leave removes local access and recovery data");
  await manualContext.close();

  await first.locator("#teamName").fill("Newer remote version");
  await saveShared(first);
  await second.locator("#teamName").fill("Stale local version");
  await second.locator("#btnSave").click();
  await second.locator("#fileStatus").filter({ hasText:"newer shared version" }).waitFor();
  const staleBackup = await downloadBackup(second);
  assert.equal(JSON.parse(staleBackup.buffer.toString("utf8")).team.name, "Stale local version");
  assert.equal(staleBackup.buffer.includes(Buffer.from(accessCode)), false);
  await second.locator("#btnLoadLatest").click();
  await second.locator("#fileStatus").filter({ hasText:"Opened the latest shared design" }).waitFor();
  await second.locator("#btnOpenBackup").click();
  await second.locator("#teamFileInput").setInputFiles({ name:staleBackup.name, mimeType:"application/json", buffer:staleBackup.buffer });
  await second.locator("#fileStatus").filter({ hasText:"browser draft" }).waitFor();
  await gotoTeam(second);
  assert.equal(await second.locator("#teamName").inputValue(), "Stale local version");
  await saveShared(second);
  ok("stale save preserves work and backup recovery creates a deliberate new revision");

  await first.locator("#btnOpen").click();
  await first.locator("#fileStatus").filter({ hasText:"Opened the latest shared design" }).waitFor();
  await setTeamName(first, "Lost response version");
  const writesBeforeLoss = github.writes.length;
  await first.locator("#btnSave").click();
  await first.locator("#fileStatus").filter({ hasText:"Could not reach" }).waitFor({ timeout:10000 });
  await first.locator("#btnSave").click();
  await first.locator("#fileStatus").filter({ hasText:/Shared design saved|already up to date/ }).waitFor({ timeout:10000 });
  assert.equal(github.writes.length, writesBeforeLoss + 1);
  assert.equal([...seenMutations.values()].some(count => count >= 3), true);
  ok("lost save response retries the same mutation without a duplicate revision");

  await setTeamName(first, "Delayed version");
  await first.locator("#btnSave").click({ noWaitAfter:true });
  await first.locator("#teamName").fill("Changed during delayed save");
  await first.locator("#fileStatus").filter({ hasText:"newer changes" }).waitFor({ timeout:10000 });
  assert.match(await first.locator("#saveStatus").textContent(), /not shared yet/i);
  await saveShared(first);
  ok("edits made during an in-flight save remain visibly unsaved");

  await first.locator("#teamName").fill("Unsaved browser recovery");
  await first.reload();
  await first.locator("#teamName").waitFor();
  assert.equal(await first.locator("#teamName").inputValue(), "Unsaved browser recovery");
  await first.locator("#fileStatus").filter({ hasText:"unsaved changes" }).waitFor();
  ok("reload preserves a dirty browser draft instead of silently replacing it");

  await saveShared(first);
  await first.getByRole("button", { name:/Step \d+ of .*Review/ }).click();
  await first.locator("#btnSend").click();
  await first.locator("#fileStatus").filter({ hasText:"processing" }).waitFor();
  await first.locator("#fileStatus").filter({ hasText:"Britt received the review request" }).waitFor({ timeout:25000 });
  assert.equal(github.dispatched.payloadJson.includes(accessCode), false);
  ok("send reports processing until the backend confirms a received proposal");

  await first.locator("#btnHistory").click();
  await first.locator("#historyPanel .history-list").waitFor();
  assert.ok(await first.locator("#historyPanel button").count() >= 2);
  assert.equal(await first.locator("#btnHistory").getAttribute("aria-expanded"), "true");
  await first.evaluate(() => {
    const notice = document.querySelector("#fileStatus");
    notice.hidden = false;
    notice.textContent = "Britt received the review request. https://github.com/doclegg05/Curriculum-Employability-Skills/pull/123?receipt=synthetic-long-received-review-address-for-responsive-testing";
  });
  for (const [width, height] of [[1280, 900], [1280, 720], [390, 700]]) {
    await first.setViewportSize({ width, height });
    await assertPanelControlReachable(first, "#btnCopyView", 80);
  }
  await first.setViewportSize({ width:1280, height:900 });
  if (process.env.BESPOKE_HISTORY_SCREENSHOT) {
    await first.screenshot({ path:process.env.BESPOKE_HISTORY_SCREENSHOT });
  }
  ok("expanded history keeps a selected form control reachable at desktop, short desktop, and phone sizes");
  const latestBeforeHistory = github.writes.at(-1).sha;
  await first.locator("#historyPanel button").last().click();
  await first.locator("#fileStatus").filter({ hasText:"Previous choices loaded" }).waitFor();
  assert.equal(await first.locator("#historyPanel").isVisible(), false);
  assert.equal(await first.locator("#btnHistory").getAttribute("aria-expanded"), "false");
  await first.waitForFunction(() => document.activeElement?.id === "stepPanel");
  await saveShared(first);
  assert.equal(github.writes.at(-1).revision, latestBeforeHistory);
  ok("history loads old choices onto the latest revision for a deliberate new save");

  await setTeamName(first, "Snapshot stays local");
  await first.getByRole("button", { name:/Step \d+ of .*Review/ }).click();
  await first.evaluate(() => {
    navigator.clipboard.writeText = async value => { window.__bespokeCopiedSnapshot = value; };
    document.querySelector("#btnCopyView").click();
  });
  await first.locator("#shareStatus").filter({ hasText:"Snapshot link copied" }).waitFor();
  const snapshotUrl = await first.evaluate(() => window.__bespokeCopiedSnapshot);
  assert.match(snapshotUrl, /#v=/);
  const opensBeforeSnapshot = apiActions.filter(action => action === "open").length;
  const snapshot = await ready(await firstContext.newPage(), snapshotUrl);
  assert.equal(await snapshot.locator("body").getAttribute("data-access"), "view");
  await gotoTeam(snapshot);
  assert.equal(await snapshot.locator("#teamName").inputValue(), "Snapshot stays local");
  assert.equal(apiActions.filter(action => action === "open").length, opensBeforeSnapshot);
  assert.equal(await snapshot.locator("#teamSessionBar").isVisible(), false);
  await snapshot.close();
  ok("a view snapshot is not replaced by the remembered team session at startup");

  const timeoutContext = await newContext({ reducedMotion:"reduce" });
  await timeoutContext.addInitScript(() => {
    const nativeSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = (callback, delay, ...args) => nativeSetTimeout(callback, delay === 20000 ? 80 : delay, ...args);
  });
  const timeoutPage = await ready(await timeoutContext.newPage(), teamUrl);
  await timeoutPage.locator("#fileStatus").filter({ hasText:"Opened the latest shared design" }).waitFor();
  await setTeamName(timeoutPage, "Stalled request version");
  const writesBeforeTimeout = github.writes.length;
  await timeoutPage.locator("#btnSave").click();
  await timeoutPage.locator("#fileStatus").filter({ hasText:"took too long" }).waitFor({ timeout:3000 });
  const timedOutMutation = await timeoutPage.evaluate(() => JSON.parse(localStorage.getItem("bespoke-team-session-v1")).pendingSave.mutationId);
  await timeoutPage.locator("#btnSave").click();
  await timeoutPage.locator("#fileStatus").filter({ hasText:/Shared design saved|already up to date/ }).waitFor({ timeout:10000 });
  assert.equal(github.writes.length, writesBeforeTimeout + 1);
  assert.equal(seenMutations.get(timedOutMutation), 2);
  ok("a stalled save times out and retries the same pending mutation safely");
  await timeoutContext.close();

  await first.addScriptTag({ path:path.join(root, "node_modules/axe-core/axe.min.js") });
  const violations = await first.evaluate(async () => (await axe.run(document, { runOnly:{ type:"tag", values:["wcag2a","wcag2aa","wcag21aa"] } })).violations.map(v => v.id));
  assert.deepEqual(violations, []);
  for (const width of [1280, 768, 390]) {
    await first.setViewportSize({ width, height:900 });
    assert.equal(await first.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await first.locator("#btnDownloadBackup").isVisible(), true);
    assert.equal(await first.locator("#btnOpenBackup").isVisible(), true);
    const layout = await editorLayout(first);
    assert.ok(layout.panel.height >= 80, `${width}: ${JSON.stringify(layout)}`);
    assert.ok(layout.panel.top >= layout.workspace.top && layout.panel.bottom <= layout.workspace.bottom + 1, `${width}: ${JSON.stringify(layout)}`);
    if (width === 390) {
      await first.evaluate(() => { document.querySelector(".header-actions").scrollLeft = 0; });
      const primaryActions = await first.evaluate(() => {
        const element = document.querySelector(".header-actions");
        const bar = element.getBoundingClientRect();
        const save = document.querySelector("#btnSave").getBoundingClientRect();
        const open = document.querySelector("#btnOpen").getBoundingClientRect();
        return {
          bar:{ left:bar.left, right:bar.right, scrollLeft:element.scrollLeft, justify:getComputedStyle(element).justifyContent },
          save:{ left:save.left, right:save.right, order:getComputedStyle(document.querySelector("#btnSave")).order },
          open:{ left:open.left, right:open.right, order:getComputedStyle(document.querySelector("#btnOpen")).order },
          children:Array.from(element.children).map(child => ({ id:child.id, order:getComputedStyle(child).order, display:getComputedStyle(child).display, left:child.getBoundingClientRect().left, width:child.getBoundingClientRect().width }))
        };
      });
      assert.ok(primaryActions.save.left >= primaryActions.bar.left && primaryActions.open.right <= primaryActions.bar.right, JSON.stringify(primaryActions));
    }
  }
  ok("team session controls and selected form remain reachable at desktop, tablet, and phone widths");

  const offlineContext = await newContext({ reducedMotion:"reduce" });
  const offline = await offlineContext.newPage();
  await offline.route("**/handoff-config.json", route => route.fulfill({ status:404, body:"" }));
  await ready(offline);
  const localBackup = await downloadBackup(offline);
  await offline.locator("#btnOpenBackup").click();
  await offline.locator("#teamFileInput").setInputFiles({ name:localBackup.name, mimeType:"application/json", buffer:localBackup.buffer });
  await offline.locator("#fileStatus").filter({ hasText:"browser draft" }).waitFor();
  await offline.locator("#btnSave").click();
  await offline.locator("#openDialog").waitFor({ state:"visible" });
  ok("backup download and open remain usable when shared setup is unavailable");
  await offlineContext.close();

  const focusContext = await newContext({ reducedMotion:"reduce" });
  const focusPage = await ready(await focusContext.newPage());
  await focusPage.locator("#btnSend").click();
  await focusPage.locator("#openDialog").waitFor({ state:"visible" });
  await focusPage.keyboard.press("Escape");
  assert.equal(await focusPage.evaluate(() => document.activeElement && document.activeElement.id), "btnSend", "Escape returns focus to the opening control");
  await focusPage.locator("#btnSend").click();
  await focusPage.locator("#openDialog").waitFor({ state:"visible" });
  await focusPage.locator("#openCancel").click();
  assert.equal(await focusPage.evaluate(() => document.activeElement && document.activeElement.id), "btnSend", "Cancel returns focus to the opening control");
  await focusContext.close();
  ok("closing the access dialog hands focus back to the control that opened it");

  const idleContext = await newContext({ reducedMotion:"reduce" }, { idleMs:300, stepMs:60000 });
  const idle = await ready(await idleContext.newPage(), teamUrl);
  await idle.locator("#fileStatus").filter({ hasText:"Opened the latest shared design" }).waitFor();
  const writesBeforeIdle = github.writes.length;
  await setTeamName(idle, "Autosaved after a pause");
  await idle.locator("#saveStatus").filter({ hasText:/saved to the shared design automatically/i }).waitFor({ timeout:5000 });
  await waitForWrites(writesBeforeIdle + 1);
  assert.equal(await sharedTeamName(), "Autosaved after a pause");
  ok("autosave shares a change after the team pauses, and a new browser opens it");

  const stepContext = await newContext({ reducedMotion:"reduce" }, { idleMs:60000, stepMs:100 });
  const stepPage = await ready(await stepContext.newPage(), teamUrl);
  await stepPage.locator("#fileStatus").filter({ hasText:"Opened the latest shared design" }).waitFor();
  await setTeamName(stepPage, "Saved on step change");
  const writesBeforeStep = github.writes.length;
  await stepPage.waitForTimeout(300);
  assert.equal(github.writes.length, writesBeforeStep);
  await stepPage.getByRole("button", { name:/Step 3 of / }).click();
  await waitForWrites(writesBeforeStep + 1);
  assert.equal(await sharedTeamName(), "Saved on step change");
  ok("moving to another step shares changes without waiting for the pause");

  const writesBeforeStale = github.writes.length;
  await idle.locator("#teamName").fill("Stale autosave attempt");
  await idle.locator("#fileStatus").filter({ hasText:"newer shared version" }).waitFor({ timeout:5000 });
  await idle.waitForTimeout(500);
  assert.equal(github.writes.length, writesBeforeStale);
  assert.equal(await sharedTeamName(), "Saved on step change");
  ok("autosave never replaces a newer shared version");
  await idleContext.close();

  await gotoTeam(stepPage);
  await stepPage.locator("#teamName").fill("Restored from backup");
  const restoreBackup = await downloadBackup(stepPage);
  await stepPage.locator("#teamName").fill("Saved on step change");
  await stepPage.locator("#btnOpenBackup").click();
  await stepPage.locator("#teamFileInput").setInputFiles({ name:restoreBackup.name, mimeType:"application/json", buffer:restoreBackup.buffer });
  await stepPage.locator("#fileStatus").filter({ hasText:"browser draft" }).waitFor();
  const writesBeforeRestore = github.writes.length;
  await stepPage.getByRole("button", { name:/Step 3 of / }).click();
  await stepPage.waitForTimeout(400);
  assert.equal(github.writes.length, writesBeforeRestore);
  assert.match(await stepPage.locator("#saveStatus").textContent(), /choose Save shared design/i);
  await saveShared(stepPage);
  assert.equal(github.writes.length, writesBeforeRestore + 1);
  await setTeamName(stepPage, "Autosave resumes after Save");
  await stepPage.getByRole("button", { name:/Step 3 of / }).click();
  await waitForWrites(writesBeforeRestore + 2);
  ok("an opened backup waits for a deliberate Save, then autosave resumes");
  await stepContext.close();

  const defaultContext = await newContext({ reducedMotion:"reduce" }, {});
  const defaults = await ready(await defaultContext.newPage(), teamUrl);
  await defaults.locator("#fileStatus").filter({ hasText:"Opened the latest shared design" }).waitFor();
  await setTeamName(defaults, "Shipped autosave timings");
  const writesBeforeDefaults = github.writes.length;
  await defaults.getByRole("button", { name:/Step 3 of / }).click();
  await waitForWrites(writesBeforeDefaults + 1, 3000);
  assert.equal(await sharedTeamName(), "Shipped autosave timings");
  ok("the shipped timings share a change within seconds of moving to another step");
  await defaultContext.close();

  const closeContext = await newContext({ reducedMotion:"reduce" });
  const closing = await ready(await closeContext.newPage(), teamUrl);
  await closing.locator("#fileStatus").filter({ hasText:"Opened the latest shared design" }).waitFor();
  const unloadPrompts = [];
  closing.on("dialog", dialog => { if (dialog.type() === "beforeunload") unloadPrompts.push(dialog.message()); });
  await setTeamName(closing, "Unsaved when closing");
  await closing.reload();
  await closing.locator("#fileStatus").filter({ hasText:"unsaved changes" }).waitFor();
  assert.equal(unloadPrompts.length, 1);
  await saveShared(closing);
  await closing.reload();
  await closing.locator("#stepList button").first().waitFor();
  assert.equal(unloadPrompts.length, 1);
  ok("closing warns while changes are not shared, and not after they are saved");
  await closeContext.close();

  const briefContext = await newContext({ reducedMotion:"reduce" });
  const briefPage = await ready(await briefContext.newPage(), teamUrl);
  await briefPage.locator("#fileStatus").filter({ hasText:"Opened the latest shared design" }).waitFor();
  await briefPage.getByRole("button", { name:/Step \d+ of .*Describe the feel/ }).click();
  await briefPage.getByRole("button", { name:/Bold and empowered/ }).click();
  await briefPage.getByRole("button", { name:"Dark" }).click();
  await briefPage.getByRole("button", { name:/Step \d+ of .*Starting point/ }).click();
  await briefPage.locator("#btnBriefUse").click();
  await briefPage.locator(".brief-in-use").waitFor();
  await saveShared(briefPage);
  await briefContext.close();
  const reopenContext = await newContext({ reducedMotion:"reduce" });
  const reopened = await ready(await reopenContext.newPage(), teamUrl);
  await reopened.locator("#fileStatus").filter({ hasText:"Opened the latest shared design" }).waitFor();
  await reopened.getByRole("button", { name:/Step \d+ of .*Describe the feel/ }).click();
  assert.equal(await reopened.getByRole("button", { name:/Bold and empowered/ }).getAttribute("aria-pressed"), "true");
  assert.equal(await reopened.getByRole("button", { name:"Dark" }).getAttribute("aria-pressed"), "true");
  await reopened.getByRole("button", { name:/Step \d+ of .*Starting point/ }).click();
  await reopened.locator(".brief-in-use").waitFor();
  await reopenContext.close();
  ok("design brief answers travel with the shared design to another browser");

  const leadContext = await newContext({ reducedMotion:"reduce" });
  const leadPage = await ready(await leadContext.newPage());
  await leadPage.getByRole("button", { name:/Step \d+ of .*Color lead/ }).click();
  assert.equal(await leadPage.locator("#tab-cards").getAttribute("aria-selected"), "true");
  const leadLook = () => leadPage.evaluate(() => ["h3", ".divider", ".download-btn"].map(s => {
    const style = getComputedStyle(document.querySelector(`.model-content ${s}`));
    return style.color + style.backgroundImage + style.backgroundColor;
  }).join("|"));
  await leadPage.locator('#colorGrid [data-id="colorLeads.mauve"]').click();
  const mauve = await leadLook();
  await leadPage.locator('#colorGrid [data-id="colorLeads.dual-gold-green"]').click();
  const goldGreen = await leadLook();
  assert.notEqual(mauve.split("|")[0], goldGreen.split("|")[0], "heading color follows the lead");
  assert.notEqual(mauve.split("|")[1], goldGreen.split("|")[1], "rule follows the lead");
  assert.notEqual(mauve.split("|")[2], goldGreen.split("|")[2], "button follows the lead");
  await leadContext.close();
  ok("choosing a color lead visibly changes the preview it opens on");

  const sweepContext = await newContext({ reducedMotion:"reduce" });
  const sweep = await ready(await sweepContext.newPage());
  const previewPrint = () => sweep.evaluate(() => {
    const style = (el) => { if (!el) return ""; const c = getComputedStyle(el); return [c.color, c.backgroundImage, c.backgroundColor, c.borderLeftWidth, c.borderTopWidth, c.borderRadius, c.boxShadow, c.fontFamily].join("|"); };
    const stage = (s) => style(document.querySelector(`#modelStage ${s}`));
    return [style(document.querySelector("#modelMain")), style(document.querySelector("#modelSidebar")),
      ...["h1", "h2", "h3", ".slide-title", ".slide-section", ".card", ".card h4", ".divider", ".download-btn"].map(stage),
      document.querySelector(".model-content .slide-chip")?.textContent || ""].join("#");
  });
  const unchangedOptions = async (grid) => {
    const dead = [];
    for (const id of await sweep.locator(`${grid} .option:not([disabled])`).evaluateAll(els => els.map(e => e.dataset.id))) {
      const option = sweep.locator(`${grid} [data-id="${id}"]`);
      if (await option.getAttribute("aria-pressed") === "true") continue;
      // Park the pointer: a tile left under it would be hover-previewed and skew "before".
      await sweep.mouse.move(0, 0);
      const before = await previewPrint();
      await option.click();
      // Let the frame settle: a reduced-motion transition still holds the old color for one frame.
      await sweep.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      if (await previewPrint() === before) dead.push(id);
    }
    return dead;
  };
  for (const [step, grids] of [["Color lead", ["#colorGrid"]], ["Sidebar & background", ["#sidebarGrid", "#textureGrid"]], ["Title & dividers", ["#titleGrid", "#dividerGrid"]], ["Cards", ["#cardGrid"]], ["Fonts", ["#fontGrid"]]]) {
    await sweep.getByRole("button", { name: new RegExp(`Step \\d+ of .*${step.replace("&", "&")}`) }).click();
    for (const grid of grids) assert.deepEqual(await unchangedOptions(grid), [], `${grid}: options that did not change the preview`);
  }
  await sweep.getByRole("button", { name:/Step \d+ of .*Cards/ }).click();
  await sweep.locator("#varyCards").check();
  await sweep.getByRole("button", { name:/^Chapter E, Evaluation/ }).click();
  assert.match(await sweep.locator(".model-content .slide-chip").textContent(), /^Chapter E ·/);
  assert.deepEqual(await unchangedOptions("#cardGrid"), [], "vary by chapter: options that did not change the preview");
  await sweepContext.close();
  ok("every option in every design step changes the preview, including per-chapter cards");

  assert.deepEqual(errors, []);
  await secondContext.close();
  await firstContext.close();
  console.log("BeSpoke browser checks: " + passed + " passed.");
} finally {
  await browser.close();
  await new Promise(resolve => staticServer.close(resolve));
  await new Promise(resolve => apiServer.close(resolve));
}
