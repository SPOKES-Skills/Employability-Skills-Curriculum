/* SPOKES Print slides.
   Prints a lesson's slides as a workbook from the pictures listed in
   print/manifest.js (window.SPOKES_PRINT_MANIFEST), which
   scripts/capture-print-slides.mjs writes. Loaded after print/manifest.js. */
(function (root) {
  "use strict";

  const LAYOUTS = Object.freeze({
    notes: Object.freeze({ perPage: 1, orientation: "portrait", label: "Slide with note lines" }),
    two: Object.freeze({ perPage: 2, orientation: "portrait", label: "Two slides per page" }),
    full: Object.freeze({ perPage: 1, orientation: "landscape", label: "One full slide per page" })
  });
  const VERSIONS = Object.freeze({
    student: Object.freeze({ label: "Student workbook" }),
    teacher: Object.freeze({ label: "Teacher copy" })
  });
  const NOT_MADE = "Printable slides have not been made for this lesson yet.";
  const DAMAGED = "This lesson's list of printable slides is damaged. Ask the curriculum team to retake the print pictures.";

  function pictureLabel(picture) {
    return picture.label ? "Slide " + picture.slide + ", " + picture.label : "Slide " + picture.slide;
  }

  function picturesFor(manifest, version) {
    if (!VERSIONS[version]) throw new Error("Unknown version: " + version);
    return manifest.pictures
      .filter(function (picture) { return version === "teacher" || picture.student !== null; })
      .map(function (picture) {
        return {
          src: version === "teacher" ? picture.teacher : picture.student,
          label: pictureLabel(picture),
          slide: picture.slide,
          width: picture.width,
          height: picture.height
        };
      });
  }

  function buildPages(manifest, version, layout) {
    if (!LAYOUTS[layout]) throw new Error("Unknown layout: " + layout);
    const pictures = picturesFor(manifest, version);
    const perPage = LAYOUTS[layout].perPage;
    const pages = [{ kind: "cover" }];
    for (let i = 0; i < pictures.length; i += perPage) {
      pages.push({ kind: "slides", pictures: pictures.slice(i, i + perPage) });
    }
    return pages;
  }

  function isPath(value) {
    return typeof value === "string" && value !== "";
  }

  function manifestProblem(manifest) {
    if (!manifest || !Array.isArray(manifest.pictures) || manifest.pictures.length === 0) return NOT_MADE;
    const valid = typeof manifest.lessonTitle === "string" && manifest.pictures.every(function (picture) {
      return Number.isInteger(picture.slide) && picture.slide > 0 &&
        isPath(picture.teacher) && (picture.student === null || isPath(picture.student));
    });
    return valid ? null : DAMAGED;
  }

  function versionProblem(manifest, version) {
    return picturesFor(manifest, version).length === 0
      ? "The " + VERSIONS[version].label.toLowerCase() + " has no slides to print."
      : null;
  }

  // ---- Page side ----------------------------------------------------------
  const BUTTON_CLASS = "print-slides-btn";
  const DIALOG_ID = "spokesPrintSlides";
  const ROOT_ID = "spokes-print-root";
  const PAGE_RULE_ID = "spokes-print-page";
  const STYLE_ID = "spokes-print-slides-styles";
  const PAGE_RULES = Object.freeze({
    portrait: "@page { size: letter portrait; margin: 0.5in 0.5in 0.5in 1in; }",
    landscape: "@page { size: letter landscape; margin: 1in 0.5in 0.5in 0.5in; }"
  });

  const STYLES = [
    ".print-slides-btn { width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem;",
    "  margin: 0 0 0.85rem; padding: 0.65rem 0.75rem; border: 1px solid rgba(211,178,87,0.72); border-radius: 8px;",
    "  background: transparent; color: var(--light, #ffffff); font-family: var(--font-body, inherit);",
    "  font-size: 0.82rem; font-weight: 700; cursor: pointer; }",
    ".print-slides-btn::before { content: \"\\2399\"; color: var(--gold, #d3b257); font-size: 1rem; line-height: 1; }",
    ".print-slides-btn:hover, .print-slides-btn:focus-visible { background: rgba(211,178,87,0.16);",
    "  outline: 2px solid var(--gold, #d3b257); outline-offset: 2px; }",
    ".sp-dialog { margin: auto; width: calc(100% - 2rem); max-width: 30rem; border: none; border-radius: 12px; padding: 1.5rem;",
    "  background: var(--light, #ffffff); color: var(--royal, #00133f); font-family: var(--font-body, Arial, sans-serif);",
    "  box-shadow: 0 18px 50px rgba(0,19,63,0.35); }",
    ".sp-dialog::backdrop { background: rgba(0,19,63,0.55); }",
    ".sp-dialog h2 { margin: 0 0 1rem; font-size: 1.35rem; color: var(--royal, #00133f); }",
    ".sp-dialog fieldset { margin: 0 0 1rem; padding: 0.75rem 1rem; border: 1px solid var(--offwhite, #d1d3d4); border-radius: 8px; }",
    ".sp-dialog legend { padding: 0 0.35rem; font-weight: 700; }",
    ".sp-dialog label { display: flex; align-items: center; gap: 0.5rem; padding: 0.3rem 0; cursor: pointer; }",
    ".sp-count { margin: 0 0 0.75rem; font-weight: 700; }",
    ".sp-status { margin: 0 0 0.75rem; padding: 0.6rem 0.75rem; border-radius: 6px;",
    "  background: rgba(167,37,63,0.08); color: var(--mauve, #a7253f); }",
    ".sp-actions { display: flex; justify-content: flex-end; gap: 0.75rem; }",
    ".sp-actions button { min-height: 44px; padding: 0.5rem 1.1rem; border-radius: 8px; font: inherit; font-weight: 700; cursor: pointer; }",
    ".sp-cancel { background: var(--light, #ffffff); border: 1px solid var(--gray, #60636b); color: var(--royal, #00133f); }",
    ".sp-print { background: var(--dark, #004071); border: 1px solid var(--dark, #004071); color: var(--light, #ffffff); }",
    ".sp-print:disabled { background: var(--offwhite, #d1d3d4); border-color: var(--offwhite, #d1d3d4); color: var(--royal, #00133f); cursor: not-allowed; }",
    ".sp-dialog button:focus-visible, .sp-dialog input:focus-visible { outline: 3px solid var(--primary, #007baf); outline-offset: 2px; }",
    "#spokes-print-root { display: none; }",
    "@media print {",
    "  html:has(> body.sp-printing), body.sp-printing { height: auto !important; overflow: visible !important;",
    "    background: var(--light, #ffffff) !important; }",
    "  body.sp-printing > *:not(#spokes-print-root) { display: none !important; }",
    "  body.sp-printing #spokes-print-root { display: block; color: var(--royal, #00133f); font-family: Arial, Helvetica, sans-serif; }",
    "  .sp-page { box-sizing: border-box; width: 7in; height: calc(10in - 2px); display: flex; flex-direction: column;",
    "    overflow: hidden; break-after: page; page-break-after: always; }",
    "  .sp-layout-full .sp-page { width: 10in; height: calc(6.5in - 2px); }",
    "  .sp-page:last-child { break-after: auto; page-break-after: auto; }",
    "  .sp-head { box-sizing: border-box; height: 0.35in; padding-bottom: 0.08in; font-size: 10pt; font-weight: 700;",
    "    border-bottom: 1px solid var(--gray, #60636b); }",
    "  .sp-foot { box-sizing: border-box; height: 0.35in; padding-top: 0.1in; font-size: 9pt; text-align: right; }",
    "  .sp-body { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 0.2in; padding-top: 0.15in; }",
    "  .sp-slot { margin: 0; min-height: 0; display: flex; flex-direction: column; align-items: center; }",
    "  .sp-picture { display: block; max-width: 100%; object-fit: contain; border: 1px solid var(--offwhite, #d1d3d4); }",
    "  .sp-slot figcaption { margin-top: 0.05in; font-size: 9pt; }",
    "  .sp-layout-notes .sp-picture { max-height: 4.3in; }",
    "  .sp-layout-two .sp-slot { flex: 1; }",
    "  .sp-layout-two .sp-picture { max-height: 4.1in; }",
    "  .sp-layout-full .sp-picture { max-height: 5.3in; }",
    "  .sp-lines { flex: 1; -webkit-print-color-adjust: exact; print-color-adjust: exact;",
    "    background: repeating-linear-gradient(to bottom, transparent 0, transparent 0.33in, var(--gray, #60636b) 0.33in, var(--gray, #60636b) calc(0.33in + 1px)); }",
    "  .sp-cover { justify-content: center; align-items: center; gap: 0.3in; text-align: center; }",
    "  .sp-logo { max-width: 3in; max-height: 1.5in; }",
    "  .sp-cover h1 { margin: 0; font-size: 30pt; }",
    "  .sp-cover-version { margin: 0; font-size: 14pt; }",
    "  .sp-write { width: 4.5in; margin: 0; padding-bottom: 0.05in; text-align: left; font-size: 13pt;",
    "    border-bottom: 1px solid var(--royal, #00133f); }",
    "}"
  ].join("\n");

  const DIALOG_HTML = [
    '<h2 id="spokesPrintSlidesTitle">Print slides</h2>',
    "<fieldset><legend>Version</legend>",
    '<label><input type="radio" name="spVersion" value="student" checked> Student workbook</label>',
    '<label><input type="radio" name="spVersion" value="teacher"> Teacher copy, includes answers</label>',
    "</fieldset>",
    "<fieldset><legend>Layout</legend>",
    '<label><input type="radio" name="spLayout" value="notes" checked> Slide with note lines</label>',
    '<label><input type="radio" name="spLayout" value="two"> Two slides per page</label>',
    '<label><input type="radio" name="spLayout" value="full"> One full slide per page, landscape</label>',
    "</fieldset>",
    '<p class="sp-count" aria-live="polite"></p>',
    '<p class="sp-status" role="alert" hidden></p>',
    '<div class="sp-actions">',
    '<button type="button" class="sp-cancel">Cancel</button>',
    '<button type="button" class="sp-print">Print</button>',
    "</div>"
  ].join("");

  function el(tag, props, children) {
    const node = document.createElement(tag);
    const options = props || {};
    if (options.id) node.id = options.id;
    if (options.className) node.className = options.className;
    if (options.text !== undefined) node.textContent = options.text;
    (children || []).forEach(function (child) { node.appendChild(child); });
    return node;
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    document.head.appendChild(el("style", { id: STYLE_ID, text: STYLES }));
  }

  function ensureButton() {
    const section = document.querySelector(".resources-section");
    if (!section) return null;
    const existing = section.querySelector("." + BUTTON_CLASS);
    if (existing) return existing;
    const button = el("button", { className: BUTTON_CLASS, text: "Print slides" });
    button.type = "button";
    const anchor = section.querySelector(".print-all-btn") || section.querySelector(".resources-title");
    if (anchor) anchor.after(button);
    else section.prepend(button);
    return button;
  }

  function ensureDialog() {
    const existing = document.getElementById(DIALOG_ID);
    if (existing) return existing;
    const dialog = el("dialog", { id: DIALOG_ID, className: "sp-dialog" });
    dialog.setAttribute("aria-labelledby", "spokesPrintSlidesTitle");
    dialog.innerHTML = DIALOG_HTML;
    document.body.appendChild(dialog);
    return dialog;
  }

  function selected(dialog, name) {
    return dialog.querySelector('input[name="' + name + '"]:checked').value;
  }

  function showStatus(dialog, message) {
    const status = dialog.querySelector(".sp-status");
    status.hidden = !message;
    status.textContent = message || "";
  }

  function setBusy(dialog, busy) {
    dialog.querySelectorAll("input").forEach(function (input) { input.disabled = busy; });
    dialog.querySelector(".sp-print").disabled = busy;
    if (busy) dialog.querySelector(".sp-count").textContent = "Preparing pages...";
  }

  function refreshDialog(dialog) {
    setBusy(dialog, false);
    const manifest = root.SPOKES_PRINT_MANIFEST;
    const version = selected(dialog, "spVersion");
    const problem = manifestProblem(manifest) || versionProblem(manifest, version);
    showStatus(dialog, problem);
    dialog.querySelector(".sp-print").disabled = Boolean(problem);
    dialog.querySelector(".sp-count").textContent = problem
      ? ""
      : buildPages(manifest, version, selected(dialog, "spLayout")).length + " pages including the cover";
  }

  function logoSource() {
    const logo = document.querySelector(".branding-logo");
    return logo ? logo.getAttribute("src") : "SPOKES-Logo.png";
  }

  function renderCover(context) {
    const logo = el("img", { className: "sp-logo" });
    logo.alt = "SPOKES";
    logo.onerror = function () { logo.remove(); };
    logo.src = context.logoSrc;
    const isTeacher = context.version === "teacher";
    const parts = [
      logo,
      el("h1", { text: context.manifest.lessonTitle }),
      el("p", { className: "sp-cover-version", text: isTeacher ? "Teacher copy, includes answers" : "Student workbook" })
    ];
    if (!isTeacher) {
      parts.push(el("p", { className: "sp-write", text: "Name" }), el("p", { className: "sp-write", text: "Date" }));
    }
    return el("section", { className: "sp-page sp-cover" }, parts);
  }

  function renderSlidePage(page, context, number, total) {
    const figures = page.pictures.map(function (picture) {
      const img = el("img", { className: "sp-picture" });
      img.alt = picture.label;
      img.dataset.spLabel = picture.label;
      img.src = picture.src;
      return el("figure", { className: "sp-slot" }, [img, el("figcaption", { text: picture.label })]);
    });
    if (context.layout === "notes") {
      const lines = el("div", { className: "sp-lines" });
      lines.setAttribute("aria-hidden", "true");
      figures.push(lines);
    }
    return el("section", { className: "sp-page" }, [
      el("header", { className: "sp-head", text: context.manifest.lessonTitle }),
      el("div", { className: "sp-body" }, figures),
      el("footer", { className: "sp-foot", text: "Page " + number + " of " + total })
    ]);
  }

  function renderWorkbook(pages, context) {
    const sections = pages.map(function (page, index) {
      return page.kind === "cover" ? renderCover(context) : renderSlidePage(page, context, index + 1, pages.length);
    });
    return el("div", { id: ROOT_ID, className: "sp-layout-" + context.layout }, sections);
  }

  // Waits for each picture's load or error event. img.decode() is not used: Chrome
  // rejects some decodes once a few dozen full-size pictures are pending at once.
  function pictureLoaded(img) {
    return new Promise(function (resolve) {
      function done() { resolve(img.naturalWidth > 0); }
      if (img.complete) done();
      else {
        img.addEventListener("load", done, { once: true });
        img.addEventListener("error", done, { once: true });
      }
    });
  }

  function firstFailedPicture(container) {
    const pictures = Array.from(container.querySelectorAll("img.sp-picture"));
    return Promise.all(pictures.map(function (img) {
      return pictureLoaded(img).then(function (ok) { return ok ? null : img.dataset.spLabel; });
    })).then(function (results) { return results.find(Boolean) || null; });
  }

  function cleanupPrint() {
    const workbook = document.getElementById(ROOT_ID);
    if (workbook) workbook.remove();
    const rule = document.getElementById(PAGE_RULE_ID);
    if (rule) rule.remove();
    document.body.classList.remove("sp-printing");
  }

  // isCurrent() turns false when the teacher cancels or reopens the dialog while
  // pictures are still loading, so a stale attempt never reaches print().
  async function printWorkbook(dialog, isCurrent) {
    cleanupPrint();
    const manifest = root.SPOKES_PRINT_MANIFEST;
    const version = selected(dialog, "spVersion");
    const layout = selected(dialog, "spLayout");
    const context = { manifest: manifest, version: version, layout: layout, logoSrc: logoSource() };
    const workbook = renderWorkbook(buildPages(manifest, version, layout), context);
    document.body.appendChild(workbook);
    const failed = await firstFailedPicture(workbook);
    if (!isCurrent()) {
      workbook.remove();
      return;
    }
    if (failed) {
      workbook.remove();
      setBusy(dialog, false);
      dialog.querySelector(".sp-print").disabled = true;
      dialog.querySelector(".sp-count").textContent = "";
      showStatus(dialog, failed + " could not be loaded, so nothing was printed. Ask the curriculum team to retake the print pictures.");
      return;
    }
    document.head.appendChild(el("style", { id: PAGE_RULE_ID, text: PAGE_RULES[LAYOUTS[layout].orientation] }));
    document.body.classList.add("sp-printing");
    dialog.close();
    root.print();
  }

  function bindEvents(button, dialog) {
    let attempt = 0;
    button.addEventListener("click", function () {
      attempt += 1;
      // Every open starts on the answer-free version, whatever was printed last.
      dialog.querySelector('input[name="spVersion"][value="student"]').checked = true;
      refreshDialog(dialog);
      dialog.showModal();
    });
    dialog.addEventListener("change", function () { refreshDialog(dialog); });
    dialog.addEventListener("close", function () {
      attempt += 1;
      button.focus();
    });
    // The lessons navigate slides on document keydown; keep the dialog's keys
    // (arrows move between radio buttons) from changing the slide behind it.
    dialog.addEventListener("keydown", function (event) { event.stopPropagation(); });
    dialog.querySelector(".sp-cancel").addEventListener("click", function () { dialog.close(); });
    dialog.querySelector(".sp-print").addEventListener("click", function () {
      const mine = ++attempt;
      setBusy(dialog, true);
      showStatus(dialog, null);
      printWorkbook(dialog, function () { return mine === attempt && dialog.open; }).catch(function (error) {
        cleanupPrint();
        setBusy(dialog, false);
        showStatus(dialog, "Printing stopped: " + error.message);
      });
    });
    root.addEventListener("afterprint", cleanupPrint);
  }

  function init() {
    injectStyles();
    const button = ensureButton();
    if (!button) return;
    bindEvents(button, ensureDialog());
  }

  const api = Object.freeze({
    LAYOUTS: LAYOUTS,
    VERSIONS: VERSIONS,
    pictureLabel: pictureLabel,
    picturesFor: picturesFor,
    buildPages: buildPages,
    manifestProblem: manifestProblem,
    versionProblem: versionProblem
  });

  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SpokesPrintSlides = api;

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
  }
})(typeof window !== "undefined" ? window : globalThis);
