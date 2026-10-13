// Prints every released lesson in every version and layout and checks the PDF.
// PRINT_SAMPLES_DIR=<dir> also saves one lesson's six PDFs for human review.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { after, before } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { parseManifest, pdfPageCount } from "./print-slides-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERSIONS = ["student", "teacher"];
const LAYOUTS = ["notes", "two", "full"];
const SAMPLES_DIR = process.env.PRINT_SAMPLES_DIR || "";
const SAMPLE_LESSON = process.env.PRINT_SAMPLE_LESSON || "lesson-problem-solving-and-decision-making";
const lessons = JSON.parse(fs.readFileSync(path.join(root, "lesson-registry.json"), "utf8")).lessons
  .filter((lesson) => lesson.path && fs.existsSync(path.join(root, lesson.path)))
  .map((lesson) => path.dirname(lesson.path))
  .sort();
let browser;

before(async () => { browser = await chromium.launch(); });
after(async () => { await browser.close(); });

function expectedSources(manifest, version) {
  return manifest.pictures
    .filter((picture) => version === "teacher" || picture.student !== null)
    .map((picture) => (version === "teacher" ? picture.teacher : picture.student));
}

for (const lesson of lessons) {
  test(lesson, async (t) => {
    const manifest = parseManifest(fs.readFileSync(path.join(root, lesson, "print", "manifest.js"), "utf8"));
    const page = await browser.newPage();
    await page.goto(pathToFileURL(path.join(root, lesson, "index.html")).href, { waitUntil: "load" });
    await page.evaluate(() => { window.print = () => { window.__printed = true; }; });
    for (const version of VERSIONS) {
      for (const layout of LAYOUTS) {
        await t.test(`${version} ${layout}`, async () => {
          await page.click(".print-slides-btn");
          await page.check(`input[name="spVersion"][value="${version}"]`);
          await page.check(`input[name="spLayout"][value="${layout}"]`);
          const promised = parseInt(await page.textContent(".sp-count"), 10);
          await page.evaluate(() => { window.__printed = false; });
          await page.click(".sp-print");
          await page.waitForFunction(() => window.__printed === true);
          const shown = await page.evaluate(() => [...document.querySelectorAll("#spokes-print-root img.sp-picture")]
            .map((img) => ({ src: img.getAttribute("src"), loaded: img.complete && img.naturalWidth > 0 })));
          assert.deepEqual(shown.map((s) => s.src), expectedSources(manifest, version));
          assert.deepEqual(shown.filter((s) => !s.loaded), []);
          await page.emulateMedia({ media: "print" });
          const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
          await page.emulateMedia({ media: "screen" });
          assert.equal(pdfPageCount(pdf), promised);
          if (SAMPLES_DIR && lesson === SAMPLE_LESSON) {
            fs.mkdirSync(SAMPLES_DIR, { recursive: true });
            fs.writeFileSync(path.join(SAMPLES_DIR, `${lesson}-${version}-${layout}.pdf`), pdf);
          }
          await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
        });
      }
    }
    await page.close();
  });
}
