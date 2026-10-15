// Opens a built offline lessons copy over file://, the way a teacher's
// computer opens it from a flash drive, and fails on anything that breaks:
// failed requests, console errors, fonts, images, videos, caption tracks,
// Dashboard lesson links, and axe WCAG A/AA rules on START HERE.
//
// Usage: node scripts/check-offline-package.mjs <package-folder> [--browser chromium|webkit]
// Build the folder first: python3 scripts/build-offline-package.py --no-zip
//
// Exit codes: 0 = every page passed, 1 = problems found, 2 = bad input.

import { readFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { chromium, webkit } from "playwright";

const BROWSERS = { chromium, webkit };
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
// Without a server the Dashboard cannot read lesson-registry.json (it is not
// in the copy) and shows its built-in FALLBACK_LESSONS list instead.
const EXPECTED_CONSOLE = /lesson-registry\.json|Cross origin requests are only supported for HTTP/;

function parseArgs(argv) {
  const [packageDir, ...rest] = argv;
  const browserFlag = rest.indexOf("--browser");
  const browser = browserFlag === -1 ? "chromium" : rest[browserFlag + 1];
  if (!packageDir || !BROWSERS[browser]) {
    throw new Error("usage: check-offline-package.mjs <package-folder> [--browser chromium|webkit]");
  }
  const root = path.resolve(packageDir);
  if (!existsSync(path.join(root, "START HERE.html"))) throw new Error(`${root}: no START HERE.html`);
  return { root, browser };
}

function lessonFolders(root) {
  return readdirSync(path.join(root, "lesson-files"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("lesson-"))
    .map((entry) => entry.name)
    .sort();
}

async function openPage(context, file) {
  const page = await context.newPage();
  const problems = [];
  page.on("requestfailed", (request) => {
    const error = request.failure()?.errorText ?? "failed";
    // Media elements cancel and restart their own range requests.
    if (error.includes("ERR_ABORTED") && /\.mp4$/i.test(request.url())) return;
    problems.push(`request failed (${error}): ${decodeURI(request.url())}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error" && !EXPECTED_CONSOLE.test(message.text())) {
      problems.push(`console error: ${message.text().slice(0, 240)}`);
    }
  });
  // WebKit reports the same registry read as a page error, not a console one.
  page.on("pageerror", (error) => {
    if (!EXPECTED_CONSOLE.test(error.message)) problems.push(`script error: ${error.message.slice(0, 240)}`);
  });
  await page.goto(pathToFileURL(file).href, { waitUntil: "load" });
  return { page, problems };
}

// Runs in the page: loads every font, image, video and caption track, then
// returns one line per thing that did not load.
async function inspectMedia() {
  const problems = [];
  await Promise.allSettled([...document.fonts].map((face) => face.load()));
  for (const face of document.fonts) if (face.status === "error") problems.push(`font did not load: ${face.family}`);

  const images = [...document.images];
  images.forEach((img) => { img.loading = "eager"; });
  await Promise.allSettled(images.map((img) => img.decode()));
  for (const img of images) if (img.naturalWidth === 0) problems.push(`image did not load: ${img.getAttribute("src")}`);

  for (const video of document.querySelectorAll("video")) {
    const name = (video.querySelector("source")?.getAttribute("src") ?? video.getAttribute("src") ?? "video").split("/").pop();
    for (const track of video.textTracks) track.mode = "hidden";
    video.preload = "metadata";
    if (video.readyState < 1) {
      video.load();
      await new Promise((resolve) => {
        video.addEventListener("loadedmetadata", resolve, { once: true });
        video.addEventListener("error", resolve, { once: true });
        setTimeout(resolve, 10000);
      });
    }
    if (video.readyState < 1) problems.push(`video did not load: ${name}`);
    const tracks = [...video.querySelectorAll("track")];
    if (tracks.length === 0) problems.push(`video has no caption track: ${name}`);
    // A track settles at LOADED (2) or ERROR (3); give slow ones five seconds.
    for (let waited = 0; waited < 5000 && tracks.some((track) => track.readyState < 2); waited += 100) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    for (const track of tracks) {
      if (track.readyState !== 2 || !track.track?.cues?.length) problems.push(`captions did not load: ${name}`);
    }
  }
  return problems;
}

async function checkStartPage(context, root, axeSource) {
  const { page, problems } = await openPage(context, path.join(root, "START HERE.html"));
  problems.push(...(await page.evaluate(inspectMedia)));
  await page.addScriptTag({ content: axeSource });
  const axe = await page.evaluate((tags) => window.axe.run(document, { runOnly: { type: "tag", values: tags } }), AXE_TAGS);
  for (const violation of axe.violations) problems.push(`axe ${violation.id}: ${violation.nodes.length} node(s)`);
  await Promise.all([page.waitForEvent("load"), page.click("a.open")]);
  if (!page.url().endsWith("/lesson-files/Dashboard.html")) problems.push(`"Open the lessons" went to ${page.url()}`);
  await page.close();
  return problems;
}

async function checkDashboard(context, root, lessons) {
  const { page, problems } = await openPage(context, path.join(root, "lesson-files", "Dashboard.html"));
  await page.waitForFunction(() => document.querySelectorAll("#dashboardGrid a[href]").length > 0, null, { timeout: 10000 })
    .catch(() => problems.push("Dashboard showed no lesson cards"));
  problems.push(...(await page.evaluate(inspectMedia)));
  const links = await page.$$eval("#dashboardGrid a[href]", (anchors) => anchors.map((a) => a.getAttribute("href")));
  const linked = new Set(links.map((href) => href.split("/")[0]));
  for (const lesson of lessons) if (!linked.has(lesson)) problems.push(`no Dashboard card links to ${lesson}`);
  for (const href of links) {
    if (!existsSync(path.join(root, "lesson-files", href))) problems.push(`Dashboard links to ${href}, which is not in the copy`);
  }
  await page.close();
  return problems;
}

async function checkLesson(context, root, lesson) {
  const { page, problems } = await openPage(context, path.join(root, "lesson-files", lesson, "index.html"));
  problems.push(...(await page.evaluate(inspectMedia)));
  await page.close();
  return problems;
}

async function run({ root, browser }) {
  const require = createRequire(import.meta.url);
  const axeSource = await readFile(require.resolve("axe-core/axe.min.js"), "utf8");
  const lessons = lessonFolders(root);
  const instance = await BROWSERS[browser].launch();
  const context = await instance.newContext({ offline: browser === "chromium" });
  const results = [];
  try {
    results.push(["START HERE.html", await checkStartPage(context, root, axeSource)]);
    results.push(["Dashboard.html", await checkDashboard(context, root, lessons)]);
    for (const lesson of lessons) results.push([lesson, await checkLesson(context, root, lesson)]);
  } finally {
    await instance.close();
  }
  return results;
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return 2;
  }
  const results = await run(args);
  let total = 0;
  for (const [name, problems] of results) {
    console.log(`${problems.length ? "FAIL" : "ok  "} ${name}`);
    for (const problem of problems) console.log(`       ${problem}`);
    total += problems.length;
  }
  console.log(`${args.browser}: ${results.length} pages, ${total} problem(s) in ${args.root}`);
  return total ? 1 : 0;
}

process.exitCode = await main();
