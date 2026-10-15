import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "scripts/print-slides.js"), "utf8"), sandbox);
const Print = sandbox.window.SpokesPrintSlides;
// Objects built inside the vm carry its Array prototype; compare plain copies.
const plain = (value) => JSON.parse(JSON.stringify(value));

const manifest = {
  version: 1,
  lessonTitle: "Sample Lesson",
  sourceHash: "abc",
  pictures: [
    { slide: 1, title: "Welcome", label: "", student: "print/s01.jpg", teacher: "print/s01.jpg", width: 2400, height: 1350 },
    { slide: 3, title: "Steps", label: "tab 1 of 2", student: "print/s03.jpg", teacher: "print/s03.jpg", width: 2400, height: 1350 },
    { slide: 3, title: "Steps", label: "tab 2 of 2", student: null, teacher: "print/s03-v2-t.jpg", width: 2400, height: 1350 },
    { slide: 5, title: "Quiz", label: "", student: "print/s05.jpg", teacher: "print/s05-t.jpg", width: 2400, height: 1600 },
  ],
};
const srcs = (pages) => plain(pages.filter((p) => p.kind === "slides").flatMap((p) => p.pictures.map((x) => x.src)));

test("student notes layout is a cover plus one page per student picture", () => {
  const pages = Print.buildPages(manifest, "student", "notes");
  assert.equal(pages.length, 4);
  assert.equal(pages[0].kind, "cover");
  assert.deepEqual(srcs(pages), ["print/s01.jpg", "print/s03.jpg", "print/s05.jpg"]);
});

test("teacher copy adds teacher-only pictures and uses answer pictures", () => {
  const pages = Print.buildPages(manifest, "teacher", "notes");
  assert.equal(pages.length, 5);
  assert.deepEqual(srcs(pages), ["print/s01.jpg", "print/s03.jpg", "print/s03-v2-t.jpg", "print/s05-t.jpg"]);
});

test("two-per-page layout pairs pictures and leaves the last page half full", () => {
  const student = Print.buildPages(manifest, "student", "two");
  assert.equal(student.length, 3);
  assert.equal(student[1].pictures.length, 2);
  assert.equal(student[2].pictures.length, 1);
  assert.equal(Print.buildPages(manifest, "teacher", "two").length, 3);
});

test("full layout is one picture per landscape page", () => {
  assert.equal(Print.buildPages(manifest, "teacher", "full").length, 5);
  assert.equal(Print.LAYOUTS.full.orientation, "landscape");
  assert.equal(Print.LAYOUTS.notes.orientation, "portrait");
  assert.equal(Print.LAYOUTS.two.orientation, "portrait");
});

test("labels name the on-screen slide number and the view", () => {
  const labels = Print.buildPages(manifest, "teacher", "notes").slice(1).map((p) => p.pictures[0].label);
  assert.deepEqual(plain(labels), ["Slide 1", "Slide 3, tab 1 of 2", "Slide 3, tab 2 of 2", "Slide 5"]);
});

test("unknown version or layout throws", () => {
  assert.throws(() => Print.buildPages(manifest, "parent", "notes"), /Unknown version/);
  assert.throws(() => Print.buildPages(manifest, "student", "four"), /Unknown layout/);
});

test("manifestProblem explains a missing or damaged manifest", () => {
  assert.match(Print.manifestProblem(undefined), /not been made/);
  assert.match(Print.manifestProblem(null), /not been made/);
  assert.match(Print.manifestProblem({ lessonTitle: "X", pictures: [] }), /not been made/);
  assert.match(Print.manifestProblem({ lessonTitle: "X", pictures: [{ slide: 1, student: null, teacher: "" }] }), /damaged/);
  assert.match(Print.manifestProblem({ pictures: [manifest.pictures[0]] }), /damaged/);
  assert.equal(Print.manifestProblem(manifest), null);
});

test("a version with nothing to print is reported", () => {
  const teacherOnly = { ...manifest, pictures: [manifest.pictures[2]] };
  assert.match(Print.versionProblem(teacherOnly, "student"), /no slides/);
  assert.equal(Print.versionProblem(teacherOnly, "teacher"), null);
});
