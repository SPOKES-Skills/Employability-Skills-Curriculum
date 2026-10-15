#!/usr/bin/env node
// Takes the pictures behind each lesson's Print slides workbook.
//   node scripts/capture-print-slides.mjs                  retake every registered lesson
//   node scripts/capture-print-slides.mjs <lesson-folder>  retake one lesson
//   node scripts/capture-print-slides.mjs --check          exit 1 if any lesson changed since its pictures
// Clicks and CSS are applied only inside the headless browser; lesson files are never edited.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  checkLesson, formatManifest, lessonTitleFrom, missingPictures, parseManifest,
  parseSettings, pictureFileName, sha256, sourceFingerprint, unmatchedSettings,
} from "./print-slides-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// One pixel taller than the lessons' short-screen layout, @media (max-height: 900px),
// which squeezes cards until their text is clipped. 901 keeps the 16:9 proportions.
const VIEWPORT = Object.freeze({ width: 1600, height: 901 });
const DEVICE_SCALE = 1.5;
const JPEG_QUALITY = 82;
// An open accordion taller than this would print below 75% scale, so it splits.
const MAX_READABLE_HEIGHT = Math.round(VIEWPORT.height / 0.75);
const MAX_LESSON_BYTES = 20 * 1024 * 1024;
// Clicked for the Teacher copy. Correct choices also get a check mark and outline,
// because the lessons mark them by color alone, which a black-and-white printer loses.
const TEACHER_CONTROLS = Object.freeze({
  correctChoices: [
    '[onclick*="checkQuiz(this, true)"]',
    '[onclick*="checkAnswer(this, true)"]',
    '.qa-choice-btn[data-correct="true"]',
  ],
  reveals: [
    ".quiz-reveal-btn",
    '.match-control-btn[onclick*="revealMatchingAnswers"]',
  ],
});
// Slide children keep their natural height: with answers open, flex shrink would
// squeeze cards over each other instead of letting the slide grow for the picture.
const CAPTURE_CSS = `
.slide.active > * { flex-shrink: 0 !important; }
html.sp-expand, html.sp-expand body, html.sp-expand .container, html.sp-expand main.main {
  height: auto !important; min-height: 100vh; overflow: visible !important; }
html.sp-expand .slide.active { height: auto !important; min-height: 100vh; overflow: visible !important; }
nav.sidebar, .sidebar-toggle, .progress-bar, .nav-hint, .nav-pos, .branding-logo, .skip-link,
.video-toolbar, .flip-hint, .print-slides-btn, #spokesPrintSlides { display: none !important; }
textarea { color: transparent !important; resize: none !important;
  background: repeating-linear-gradient(to bottom, transparent 0, transparent 35px, #60636b 35px, #60636b 36px) !important; }
textarea::placeholder { color: transparent !important; }
.sp-answer { outline: 4px solid currentColor !important; outline-offset: 3px !important; font-weight: 700 !important; }
.sp-answer::before { content: "\\2713\\00a0"; font-weight: 900; }
.sp-video-box { display: flex; align-items: center; justify-content: center; aspect-ratio: 16 / 9; width: 100%;
  box-sizing: border-box; padding: 1rem; border: 3px dashed currentColor; border-radius: 12px;
  font-size: 1.3rem; font-weight: 700; text-align: center; }
`;

class UsageError extends Error {}

function registeredLessons() {
  const registry = JSON.parse(fs.readFileSync(path.join(root, "lesson-registry.json"), "utf8"));
  return registry.lessons
    .filter((lesson) => lesson.path && fs.existsSync(path.join(root, lesson.path)))
    .map((lesson) => path.dirname(lesson.path))
    .sort();
}

function parseArgs(argv) {
  const known = registeredLessons();
  const named = argv.filter((arg) => arg !== "--check").map((arg) => arg.replace(/\/+$/, ""));
  const unknown = named.filter((name) => !known.includes(name));
  if (unknown.length) throw new UsageError(`unknown lesson folder ${unknown.join(", ")}. Known: ${known.join(", ")}`);
  return { check: argv.includes("--check"), lessons: named.length ? named : known };
}

function readManifestSource(dir) {
  const file = path.join(dir, "print", "manifest.js");
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

function runCheck(lessons) {
  let failures = 0;
  for (const lesson of lessons) {
    const dir = path.join(root, lesson);
    const source = readManifestSource(dir);
    const result = checkLesson(fs.readFileSync(path.join(dir, "index.html")), readSettingsText(dir), source);
    const missing = result.ok ? missingPictures(parseManifest(source), (file) => fs.existsSync(path.join(dir, file))) : [];
    if (result.ok && missing.length === 0) {
      console.log(`  ${lesson}: print pictures current`);
      continue;
    }
    failures += 1;
    const reason = result.ok ? `missing ${missing.join(", ")}` : result.reason;
    console.error(`  ${lesson}: ${reason}. Fix: node scripts/capture-print-slides.mjs ${lesson}`);
  }
  return failures === 0 ? 0 : 1;
}

const settingsPath = (dir) => path.join(dir, "print", "print-settings.json");

// Raw settings text, "" when the file is absent. The fingerprint hashes exactly this.
function readSettingsText(dir) {
  return fs.existsSync(settingsPath(dir)) ? fs.readFileSync(settingsPath(dir), "utf8") : "";
}

function loadSettings(dir) {
  return parseSettings(readSettingsText(dir) || "{}", path.relative(root, settingsPath(dir)));
}

// ---- Functions below run inside the page through page.evaluate --------------

function surveyLesson() {
  return [...document.querySelectorAll(".slide")].map((slide) => ({
    hasVideo: Boolean(slide.querySelector("video")),
    tabPanelIds: [...slide.querySelectorAll(".tab-btn, .qa-tab-btn")].map((button) =>
      button.getAttribute("aria-controls") || ((button.getAttribute("onclick") || "").match(/'([^']+)'/) || [])[1] || ""),
  }));
}

function describeSlide() {
  const slide = document.querySelector(".slide.active");
  const text = (node) => (node ? node.textContent.replace(/\s+/g, " ").trim() : "");
  const tabs = [...slide.querySelectorAll(".tab-btn, .qa-tab-btn")].map((button, index) => ({
    index,
    panelId: button.getAttribute("aria-controls") || ((button.getAttribute("onclick") || "").match(/'([^']+)'/) || [])[1] || "",
  }));
  return {
    title: slide.dataset.sidebarTitle || text(slide.querySelector("h1, h2")),
    hasVideo: Boolean(slide.querySelector("video")),
    tabs,
    carouselSteps: slide.querySelectorAll(".carousel-card").length,
    flipCards: slide.querySelectorAll(".danger-card").length,
    accordionSections: slide.querySelectorAll(".accordion-item").length || slide.querySelectorAll(".qa-accordion-body").length,
  };
}

function applyAction(action) {
  const slide = document.querySelector(".slide.active");
  const setItemOpen = (item, open) => {
    item.classList.toggle("open", open);
    item.querySelector(".accordion-body")?.classList.toggle("open", open);
    item.querySelector(".accordion-btn")?.classList.toggle("active", open);
    item.querySelector(".accordion-header, .accordion-btn")?.setAttribute("aria-expanded", String(open));
  };
  if (action.type === "tab") {
    slide.querySelectorAll(".tab-btn, .qa-tab-btn")[action.index].click();
    return;
  }
  if (action.type === "carousel") {
    const dot = slide.querySelector(`.carousel-dot[data-step="${action.index}"]`);
    if (!dot) throw new Error(`carousel dot ${action.index} not found`);
    dot.click();
    return;
  }
  if (action.type === "flip") {
    slide.querySelectorAll(".danger-card").forEach((card) => card.click());
    const stuck = [...slide.querySelectorAll(".danger-card")].filter((card) => !card.matches(".flipped, .is-flipped"));
    if (stuck.length) throw new Error(`${stuck.length} flip card(s) did not turn over`);
    return;
  }
  if (action.type === "accordion") {
    const wanted = (index) => action.only === null || action.only === index;
    const items = [...slide.querySelectorAll(".accordion-item")];
    if (items.length) {
      items.forEach((item, index) => setItemOpen(item, wanted(index)));
      return;
    }
    slide.querySelectorAll(".qa-accordion-body").forEach((body, index) => {
      body.hidden = !wanted(index);
      slide.querySelector(`[aria-controls="${body.id}"]`)?.setAttribute("aria-expanded", String(wanted(index)));
    });
    return;
  }
  if (action.type === "video-placeholder") {
    slide.querySelectorAll("video").forEach((video) => {
      const holder = video.closest(".video-wrapper") || video;
      const item = video.closest(".video-grid-item, .video-container");
      const caption = (item && item.querySelector("p")) || slide.querySelector("h2");
      const box = document.createElement("div");
      box.className = "sp-video-box";
      box.textContent = `Video: ${caption ? caption.textContent.replace(/\s+/g, " ").trim() : ""}`;
      holder.replaceWith(box);
    });
    return;
  }
  throw new Error(`unknown capture action ${action.type}`);
}

function clickTeacherControls(controls) {
  const slide = document.querySelector(".slide.active");
  const visible = (selectors) => [...slide.querySelectorAll(selectors.join(","))].filter((el) => el.getClientRects().length > 0);
  const choices = visible(controls.correctChoices);
  const reveals = visible(controls.reveals);
  choices.forEach((el) => { el.click(); el.classList.add("sp-answer"); });
  reveals.forEach((el) => el.click());
  return choices.length + reveals.length;
}

async function finishRendering() {
  await document.fonts.ready;
  const slide = document.querySelector(".slide.active");
  // Lazy images on hidden faces (flip-card backs) never start loading, so decode() would wait forever.
  slide.querySelectorAll("img").forEach((img) => { img.loading = "eager"; });
  await Promise.all([...slide.querySelectorAll("img")].map((img) =>
    img.decode().catch(() => { throw new Error(`image failed to load: ${img.getAttribute("src")}`); })));
  document.getAnimations().forEach((animation) => animation.finish());
}

// ---- Node side ---------------------------------------------------------------

async function settle(page) {
  await page.mouse.move(0, 0);
  await page.evaluate(finishRendering);
}

async function openSlide(page, url, index) {
  await page.goto(url, { waitUntil: "load" });
  await page.addStyleTag({ content: CAPTURE_CSS });
  await page.evaluate((i) => {
    const item = document.querySelector(`.slide-item[data-slide="${i}"]`);
    if (!item) throw new Error(`sidebar item for slide index ${i} not found`);
    item.click();
  }, index);
  await settle(page);
}

async function applyActions(page, actions) {
  for (const action of actions) {
    await page.evaluate(applyAction, action);
    await settle(page);
  }
}


// A slide taller than the screen is photographed at its natural height. The viewport
// stays fixed: lesson layout uses vh units and max-height media queries, so resizing
// the window would change the design and fire the lessons' resize handlers.
async function expandSlide(page) {
  const tall = await page.evaluate(() => {
    const slide = document.querySelector(".slide.active");
    return slide.scrollHeight > slide.clientHeight + 2;
  });
  if (tall) {
    await page.evaluate(() => document.documentElement.classList.add("sp-expand"));
    await settle(page);
  }
  return page.evaluate(() => Math.round(document.querySelector(".slide.active").getBoundingClientRect().height));
}

async function collapseSlide(page) {
  await page.evaluate(() => document.documentElement.classList.remove("sp-expand"));
  await settle(page);
}

async function shoot(page) {
  await expandSlide(page);
  const slide = page.locator(".slide.active");
  const buffer = await slide.screenshot({ type: "jpeg", quality: JPEG_QUALITY, animations: "disabled" });
  const box = await slide.boundingBox();
  await collapseSlide(page);
  return { buffer, width: Math.round(box.width * DEVICE_SCALE), height: Math.round(box.height * DEVICE_SCALE) };
}

function planViews(info, settings, slideNumber) {
  const kinds = [
    info.tabs.length && "tabs", info.carouselSteps && "a carousel",
    info.flipCards && "flip cards", info.accordionSections && "an accordion",
  ].filter(Boolean);
  if (kinds.length > 1) throw new Error(`slide ${slideNumber} mixes ${kinds.join(" and ")}; add a capture rule for it`);
  const base = settings.keepVideoSlides.includes(slideNumber) ? [{ type: "video-placeholder" }] : [];
  const view = (label, actions, teacherOnly = false) => ({ label, actions: [...base, ...actions], teacherOnly });
  if (info.tabs.length) {
    return info.tabs.map((tab, i) => view(`tab ${i + 1} of ${info.tabs.length}`, [{ type: "tab", index: tab.index }],
      settings.teacherOnlyTabs.includes(tab.panelId)));
  }
  if (info.carouselSteps) {
    return Array.from({ length: info.carouselSteps }, (_, i) =>
      view(`card ${i + 1} of ${info.carouselSteps}`, [{ type: "carousel", index: i }]));
  }
  if (info.flipCards) return [view("card fronts", []), view("card backs", [{ type: "flip" }])];
  if (info.accordionSections) return [view("", [{ type: "accordion", only: null }])];
  return [view("", [])];
}

async function splitTallAccordion(page, views, info) {
  await applyActions(page, views[0].actions);
  const height = await expandSlide(page);
  await collapseSlide(page);
  if (height <= MAX_READABLE_HEIGHT) return views;
  const base = views[0].actions.slice(0, -1);
  return Array.from({ length: info.accordionSections }, (_, i) => ({
    label: `section ${i + 1} of ${info.accordionSections}`,
    actions: [...base, { type: "accordion", only: i }],
    teacherOnly: false,
  }));
}

async function captureView(page, view) {
  await applyActions(page, view.actions);
  const student = view.teacherOnly ? null : await shoot(page);
  const clicked = await page.evaluate(clickTeacherControls, TEACHER_CONTROLS);
  if (clicked > 0) await settle(page);
  const teacher = clicked > 0 || view.teacherOnly ? await shoot(page) : student;
  return { student, teacher };
}

function savePicture(printDir, fileName, shot) {
  fs.writeFileSync(path.join(printDir, fileName), shot.buffer);
  return `print/${fileName}`;
}

async function captureSlide(page, url, index, settings, printDir) {
  const slideNumber = index + 1;
  await openSlide(page, url, index);
  const info = await page.evaluate(describeSlide);
  if (info.hasVideo && !settings.keepVideoSlides.includes(slideNumber)) return [];
  let views = planViews(info, settings, slideNumber);
  if (info.accordionSections) views = await splitTallAccordion(page, views, info);
  const pictures = [];
  for (const [viewIndex, view] of views.entries()) {
    await openSlide(page, url, index);
    const { student, teacher } = await captureView(page, view);
    const studentPath = student ? savePicture(printDir, pictureFileName(slideNumber, viewIndex, "student"), student) : null;
    const same = student !== null && sha256(student.buffer) === sha256(teacher.buffer);
    const teacherPath = same ? studentPath : savePicture(printDir, pictureFileName(slideNumber, viewIndex, "teacher"), teacher);
    pictures.push({ slide: slideNumber, title: info.title, label: view.label, student: studentPath,
      teacher: teacherPath, width: teacher.width, height: teacher.height });
  }
  return pictures;
}

function jpegBytes(printDir) {
  return fs.readdirSync(printDir).filter((f) => f.endsWith(".jpg"))
    .reduce((sum, f) => sum + fs.statSync(path.join(printDir, f)).size, 0);
}

async function captureLesson(browser, lesson) {
  const dir = path.join(root, lesson);
  const indexPath = path.join(dir, "index.html");
  const settingsText = readSettingsText(dir);
  const settings = loadSettings(dir);
  const printDir = path.join(dir, "print");
  fs.mkdirSync(printDir, { recursive: true });
  const context = await browser.newContext({
    viewport: VIEWPORT, deviceScaleFactor: DEVICE_SCALE, reducedMotion: "reduce", serviceWorkers: "block",
  });
  // file:// lessons are local; deny any remote request so pictures never depend on the network.
  await context.route(/^https?:\/\//, (route) => route.abort());
  const page = await context.newPage();
  const url = pathToFileURL(indexPath).href;
  try {
    await page.goto(url, { waitUntil: "load" });
    const unmatched = unmatchedSettings(settings, await page.evaluate(surveyLesson));
    if (unmatched.length) {
      throw new Error(`${path.relative(root, settingsPath(dir))}: ${unmatched.join("; ")}. Nothing was changed.`);
    }
    fs.readdirSync(printDir).filter((f) => f.endsWith(".jpg")).forEach((f) => fs.rmSync(path.join(printDir, f)));
    const slideCount = await page.evaluate(() => document.querySelectorAll(".slide").length);
    const lessonTitle = lessonTitleFrom(await page.title());
    const pictures = [];
    for (let index = 0; index < slideCount; index += 1) {
      pictures.push(...(await captureSlide(page, url, index, settings, printDir)));
    }
    const manifest = { version: 1, lessonTitle, sourceHash: sourceFingerprint(fs.readFileSync(indexPath), settingsText), pictures };
    fs.writeFileSync(path.join(printDir, "manifest.js"), formatManifest(manifest));
    return {
      pictures: pictures.length,
      teacherOnly: pictures.filter((p) => p.student === null).length,
      withAnswers: pictures.filter((p) => p.student !== null && p.student !== p.teacher).length,
      bytes: jpegBytes(printDir),
    };
  } finally {
    await context.close();
  }
}

async function main() {
  const { check, lessons } = parseArgs(process.argv.slice(2));
  if (check) return runCheck(lessons);
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    for (const lesson of lessons) {
      const s = await captureLesson(browser, lesson);
      const mb = (s.bytes / 1048576).toFixed(1);
      console.log(`  ${lesson}: ${s.pictures} pictures, ${s.teacherOnly} teacher only, ${s.withAnswers} with answers, ${mb} MB`);
      if (s.bytes > MAX_LESSON_BYTES) {
        throw new Error(`${lesson} pictures total ${mb} MB, over the 20 MB limit. Lower JPEG_QUALITY or DEVICE_SCALE.`);
      }
    }
  } finally {
    await browser.close();
  }
  return 0;
}

main().then(
  (code) => { process.exitCode = code; },
  (error) => {
    console.error(`capture-print-slides: ${error.message}`);
    process.exitCode = error instanceof UsageError ? 2 : 1;
  },
);
