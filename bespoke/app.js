(() => {
  "use strict";

  const STORAGE_KEY = "bespoke-draft-v1";
  const BACKUP_KEY = "bespoke-previous-draft-v1";
  const TEAM_SESSION_KEY = "bespoke-team-session-v1";
  const PENDING_SUBMISSION_STORAGE = "bespoke-pending-submission-v1";
  const MAX_FILE_BYTES = 256000;
  let lastSavedRaw = null;
  let storageConflict = false;
  /**
   * Max length of a team view URL (origin + path + hash).
   * View link: `#v=` + base64url(deflate-raw(selection)).
   * View links are read-only snapshots. Private `#team=` access is separate and
   * is consumed from the address bar before shared drafts are opened.
   * Legacy `#s=` / `#c=` remain read-only. Old `#e=` links do not grant edit.
   * 8000 stays inside common email, Teams, and Slack paste limits.
   * A normal design view link is about 1,000 characters.
   */
  const SHARE_URL_MAX = 8000;
  const EDIT_CODE_MIN = 8;
  const EDIT_CODE_MAX = 128;
  const HANDOFF_TIMEOUT_MS = 20000;
  const UNLOCK_HASH_KEY = "bespoke-lead-ok";
  const UNLOCK_CODE_KEY = "bespoke-lead-code";
  const REPO = "doclegg05/Curriculum-Employability-Skills";
  const HANDOFF_CONFIG_URL = "./handoff-config.json";
  let handoffApiBase = "";
  let handoffBusy = false;
  const LIBRARY_URL = "../SPOKES%20Builder/bespoke-library-catalog.json";
  const THEME_OPTIONS_URL = "../SPOKES%20Builder/theme-options.json";
  const META_URL = "./catalog.json";
  let startupTeamLink = (() => {
    const raw = location.hash.startsWith("#team=") ? location.hash.slice(6) : "";
    if (raw) history.replaceState(null, "", location.pathname + location.search);
    return raw;
  })();

  /** `view` = the preview the step lands on; a manual tab pick sticks until the step changes. */
  const STEPS = [
    { id: "welcome", label: "How to use Bespoke", view: "title", phase: "start" },
    { id: "team", label: "Lesson & team", view: "title", phase: "start" },
    { id: "brief", label: "Describe the feel", view: "title", phase: "design" },
    { id: "preset", label: "Starting point", view: "title", phase: "design" },
    { id: "color", label: "Color lead", view: "cards", phase: "design" },
    { id: "surface", label: "Sidebar & background", view: "cards", phase: "design" },
    { id: "layouts", label: "Title & dividers", view: "title", phase: "design" },
    { id: "cards", label: "Cards", view: "cards", phase: "design" },
    { id: "fonts", label: "Fonts", view: "cards", phase: "design" },
    { id: "content", label: "Try sample text", view: "cards", phase: "finish" },
    { id: "review", label: "Review & submit", view: "title", phase: "finish" }
  ];
  const PHASES = [
    ["start", "Get started"],
    ["design", "Shape the look"],
    ["finish", "Check and send"]
  ];
  /** Step ids from before the instruction steps, so an older saved draft still opens the right screen. */
  const LEGACY_STEP_IDS = ["team", "preset", "color", "surface", "layouts", "cards", "fonts", "content", "review"];
  /** Retired step ids and the step that now holds their content. */
  const STEP_ALIASES = { return: "review" };
  const Brief = window.BespokeBrief;

  const VIEW_NAMES = { title: "Title slide", divider: "Section divider", cards: "Content slide" };

  const state = {
    step: 0,
    meta: null,
    library: null,
    lessonId: "money-management",
    teamName: "",
    spokespersonName: "",
    spokespersonEmail: "",
    presetId: "professional",
    colorLead: "blue",
    sidebarColor: "dark",
    backgroundTexture: "dot-grid",
    titleSlide: "centered-gradient",
    dividerStyle: "gradient-sweep",
    cardStyle: "left-border",
    varyCardsByChapter: false,
    chapterCards: {},
    fontPairing: "dm-serif-display-outfit",
    lessonTitle: "",
    lessonSubtitle: "",
    sampleBullets: "1. Name one money goal for this month\n2. List your fixed costs\n3. Find one place to trim spending",
    sampleMyth: "Myth: Budgets are only for people in debt.\nReality: A budget is a plan that works for any income.",
    unspoken: "",
    /** Design brief answers. Browser draft only; the shared payload keeps the resulting choices. */
    ...Brief.DEFAULT_BRIEF,
    /** Administrator-provisioned team access code. Saved on this computer only. */
    editCode: "",
    previewView: "title"
  };

  /** Transient UI state — never saved to the draft. */
  const ui = {
    renderedStep: null,
    previewPinned: false,
    lastChange: null,
    /** Label of an option being previewed on hover/focus; never saved. */
    tryingOn: null,
    /** Chapter the Cards step edits and previews while "Vary by chapter" is on. */
    cardChapter: "P1",
    cardNote: "",
    /** Preview view last drawn, so the slide fades only when the view changes. */
    renderedView: null,
    pulseTimer: null,
    restoredFromLink: false,
    restoreNote: "",
    builderNote: "",
    /** Legacy snapshot hash. New view links never grant editing. */
    editCodeHash: "",
    /** "view" until init grants a lead session, or the lead unlocks a view link. */
    mode: "view",
    teamSession: null,
    cloudConflict: null,
    cloudBusy: false,
    skipNextLocalSave: false,
    /** Set after opening a backup or an older version: those wait for a deliberate Save. */
    autosavePaused: false,
    /** Set just before this page reloads itself, so the close warning stays quiet. */
    allowUnload: false
  };

  /** Shared autosave timings. Browser tests replace them through window.__bespokeAutosave. */
  const AUTOSAVE = Object.freeze({ enabled: true, idleMs: 30000, stepMs: 1500, ...(window.__bespokeAutosave || {}) });
  let autosaveTimer = null;
  let autosaveReady = false;

  let saveAnnounceTimer = null;
  let saveAnnounceReady = false;
  let submissionPollTimer = null;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function byId(id) {
    return document.getElementById(id);
  }

  function familyOptions(family) {
    return state.library?.families?.[family]?.options || [];
  }

  function findOption(family, slug) {
    return familyOptions(family).find((o) => o.slug === slug);
  }

  function findMeta(list, id) {
    return (list || []).find((item) => item.id === id);
  }

  function uiKey(family, slug) {
    return `${family}.${slug}`;
  }

  function stepIndex(id) {
    const index = STEPS.findIndex((step) => step.id === id);
    return index < 0 ? 0 : index;
  }

  function restoreStep(saved) {
    const stepId = STEP_ALIASES[saved.stepId] || saved.stepId;
    if (stepId && STEPS.some((step) => step.id === stepId)) {
      state.step = stepIndex(stepId);
      return;
    }
    if (Number.isInteger(saved.step) && LEGACY_STEP_IDS[saved.step]) {
      state.step = stepIndex(LEGACY_STEP_IDS[saved.step]);
    } else {
      state.step = 0;
    }
  }

  function loadDraft() {
    const previous = { ...state };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved || typeof saved !== "object" || Array.isArray(saved)) throw new Error("Invalid draft");
      for (const key of Object.keys(state)) {
        if (["meta", "library", "themeOptions"].includes(key)) continue;
        if (Object.hasOwn(saved, key) && typeof saved[key] === typeof state[key]) state[key] = saved[key];
      }
      restoreStep(saved);
      validateSelectionPayload(buildSelectionPayload());
      lastSavedRaw = raw;
    } catch {
      Object.assign(state, previous);
      storageConflict = true;
      ui.restoreNote = "The saved draft could not be read. It has not been replaced. Open a team file to recover, or clear the draft to start again.";
    }
  }

  function setSaveStatus(text) {
    const el = byId("saveStatus");
    if (el) el.textContent = text;
  }

  function queueSaveAnnouncement() {
    if (!saveAnnounceReady) return;
    clearTimeout(saveAnnounceTimer);
    saveAnnounceTimer = setTimeout(() => {
      const live = byId("saveLive");
      if (!live) return;
      live.textContent = "";
      window.setTimeout(() => {
        live.textContent = "Browser draft saved";
      }, 30);
    }, 600);
  }

  function isLeadSession() {
    return ui.mode === "edit";
  }

  function newMutationId() {
    return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function selectionKey(payload) {
    const copy = JSON.parse(JSON.stringify(payload));
    delete copy.date;
    delete copy.submittedAt;
    return JSON.stringify(copy);
  }

  function currentSelectionKey() {
    try { return selectionKey(buildSelectionPayload()); }
    catch { return ""; }
  }

  function persistTeamSession() {
    if (!ui.teamSession) return;
    try { localStorage.setItem(TEAM_SESSION_KEY, JSON.stringify(ui.teamSession)); }
    catch { /* backups remain available when storage is blocked */ }
  }

  function forgetTeamSession() {
    ui.teamSession = null;
    ui.cloudConflict = null;
    state.editCode = "";
    try {
      localStorage.removeItem(TEAM_SESSION_KEY);
      localStorage.removeItem(PENDING_SUBMISSION_STORAGE);
    } catch { /* private mode */ }
  }

  function restoreTeamSession() {
    try {
      const saved = JSON.parse(localStorage.getItem(TEAM_SESSION_KEY) || "null");
      if (!saved || typeof saved !== "object") return null;
      if (!findMeta(state.meta.lessons, saved.lessonId)) return null;
      if (typeof saved.editCode !== "string" || saved.editCode.length < EDIT_CODE_MIN) return null;
      ui.teamSession = saved;
      state.editCode = saved.editCode;
      return saved;
    } catch { return null; }
  }

  function installTeamSession(lessonId, editCode) {
    const same = ui.teamSession && ui.teamSession.lessonId === lessonId && ui.teamSession.editCode === editCode;
    ui.teamSession = same ? ui.teamSession : {
      lessonId,
      editCode,
      revision: null,
      savedAt: null,
      baseSelectionKey: null,
      pendingSave: null
    };
    state.editCode = editCode;
    persistTeamSession();
  }

  function parseTeamLink(value) {
    let decoded = "";
    try { decoded = decodeURIComponent(value); } catch { decoded = value; }
    const split = decoded.indexOf(".");
    if (split < 1) return null;
    const lessonId = decoded.slice(0, split);
    const editCode = decoded.slice(split + 1);
    if (!findMeta(state.meta.lessons, lessonId)) return null;
    if (editCode.length < EDIT_CODE_MIN || editCode.length > EDIT_CODE_MAX) return null;
    return { lessonId, editCode };
  }

  function hasUnsavedTeamWork() {
    if (!ui.teamSession) return false;
    const key = currentSelectionKey();
    return Boolean(key && key !== (ui.teamSession.baseSelectionKey || ""));
  }

  function canAutosave() {
    return AUTOSAVE.enabled && autosaveReady && isLeadSession() && Boolean(ui.teamSession) &&
      Boolean(handoffApiBase) && !ui.cloudConflict && !ui.autosavePaused && !storageConflict;
  }

  function scheduleAutosave(delay) {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
    if (!canAutosave() || !hasUnsavedTeamWork()) return;
    autosaveTimer = window.setTimeout(runAutosave, delay);
  }

  function runAutosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
    if (!canAutosave() || !hasUnsavedTeamWork()) return;
    if (handoffBusy) {
      scheduleAutosave(AUTOSAVE.idleMs);
      return;
    }
    cloudSave({ auto: true });
  }

  function draftStatusText() {
    if (!ui.teamSession) return "Browser draft saved";
    if (!hasUnsavedTeamWork()) return "Shared design up to date";
    if (ui.autosavePaused) return "Choose Save shared design to share";
    return canAutosave() ? "Sharing changes automatically" : "Browser draft saved";
  }

  function updateCloudChrome() {
    const session = ui.teamSession;
    const panel = byId("teamSessionBar");
    const status = byId("teamSessionStatus");
    if (panel) panel.hidden = !session;
    if (!status) return;
    if (!session) {
      status.textContent = "Browser draft only. Open your private team access to use shared saving.";
      return;
    }
    const lesson = findMeta(state.meta?.lessons, session.lessonId);
    const saved = session.savedAt ? ` Shared version saved ${new Date(session.savedAt).toLocaleString()}.` : " No shared version has been saved yet.";
    const dirty = hasUnsavedTeamWork() ? " This browser has changes that are not in the shared design." : " This browser matches the shared design.";
    status.textContent = `${lesson?.title || session.lessonId} team session.${saved}${dirty}`;
    byId("btnLoadLatest")?.toggleAttribute("hidden", !ui.cloudConflict);
    byId("btnKeepLocal")?.toggleAttribute("hidden", !ui.cloudConflict);
    byId("btnCheckStatus")?.toggleAttribute("hidden", !pendingSubmission());
  }

  function peekDraft() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const saved = JSON.parse(raw);
      return saved && typeof saved === "object" ? saved : null;
    } catch {
      return null;
    }
  }

  function saveDraft() {
    if (!isLeadSession()) return false;
    if (storageConflict) {
      setSaveStatus("Not saved — another draft needs attention");
      return false;
    }
    state.stepId = STEPS[state.step] ? STEPS[state.step].id : "welcome";
    const { meta, library, themeOptions, ...rest } = state;
    try {
      const current = localStorage.getItem(STORAGE_KEY);
      if (current !== lastSavedRaw) {
        storageConflict = true;
        fileNotice("A different tab changed this browser draft. Choose Save to keep your work, then reload to open the other tab's version. Automatic saving is paused.");
        setSaveStatus("Not saved — another tab changed this draft");
        return false;
      }
      const nextRaw = JSON.stringify(rest);
      localStorage.setItem(STORAGE_KEY, nextRaw);
      lastSavedRaw = nextRaw;
      setSaveStatus(draftStatusText());
      updateCloudChrome();
      queueSaveAnnouncement();
      scheduleAutosave(AUTOSAVE.idleMs);
      return true;
    } catch {
      setSaveStatus("Could not save on this computer");
      return false;
    }
  }

  function syncAccessChrome() {
    const locked = !isLeadSession();
    document.body.classList.toggle("is-view-only", locked);
    document.body.dataset.access = locked ? "view" : "edit";
    const banner = byId("accessBanner");
    if (banner) {
      if (locked && banner.hidden) {
        banner.textContent = "This snapshot opens for viewing. The team lead can unlock an editing copy.";
        banner.hidden = false;
      } else if (!locked) {
        banner.hidden = true;
      }
    }
    const notice = byId("restoreNotice");
    if (notice) {
      notice.hidden = !ui.restoreNote;
      notice.textContent = ui.restoreNote || "";
    }
    const unlock = byId("leadUnlock");
    if (unlock) unlock.hidden = true;
    if (!locked) {
      const form = byId("leadCodeForm");
      const leadBtn = byId("btnLeadUnlock");
      if (form) form.hidden = true;
      if (leadBtn) leadBtn.setAttribute("aria-expanded", "false");
      const leadErr = byId("leadCodeError");
      if (leadErr) leadErr.textContent = "";
    }
    if (byId("btnSave")) byId("btnSave").disabled = locked;
    if (byId("btnOpen")) byId("btnOpen").disabled = false;
    if (byId("btnSend")) byId("btnSend").disabled = locked;
    if (byId("btnRecoverDraft")) {
      try { byId("btnRecoverDraft").hidden = locked || !localStorage.getItem(BACKUP_KEY); }
      catch { byId("btnRecoverDraft").hidden = true; }
    }
    const clearBtn = byId("btnClear");
    if (clearBtn) {
      clearBtn.disabled = locked;
      if (locked) clearBtn.setAttribute("aria-describedby", "accessBanner");
      else clearBtn.removeAttribute("aria-describedby");
    }
    if (locked) setSaveStatus("");
    updateCloudChrome();
  }

  function lockViewControls() {
    if (isLeadSession()) return;
    const panel = byId("stepPanel");
    if (!panel) return;
    panel.querySelectorAll("input, select, textarea, button").forEach((el) => {
      if (el.id === "btnBack" || el.id === "btnNext") return;
      el.disabled = true;
      el.setAttribute("aria-disabled", "true");
    });
  }

  function applyPreset(presetId) {
    if (!isLeadSession()) return;
    const preset = findMeta(state.meta.presets, presetId);
    if (!preset) return;
    const changed = Object.entries(preset.defaults).filter(([k, v]) => state[k] !== v).length;
    state.presetId = presetId;
    Object.assign(state, preset.defaults);
    if (!state.varyCardsByChapter) state.chapterCards = {};
    noteChange(
      `Applied ${preset.label} preset`,
      `${changed} setting${changed === 1 ? "" : "s"} changed — everything stays editable.`,
      true
    );
  }

  /**
   * Record what just changed so the preview caption and live region can say it
   * (e.g. "Updated · Card style → Shadow Float"). `plain` skips the arrow format.
   */
  function noteChange(dimension, label, plain = false) {
    ui.lastChange = { dimension, label, plain };
  }

  /** THM-04: adjacent WIPPEA chapters must not share the same card slug. */
  function enforceAdjacentCardUniqueness(changedKey) {
    const keys = state.meta.chapterKeys;
    const idx = keys.indexOf(changedKey);
    if (idx < 0) return;
    const current = state.chapterCards[changedKey];
    const neighbors = [keys[idx - 1], keys[idx + 1]].filter(Boolean);
    const conflict = neighbors.find((n) => state.chapterCards[n] === current);
    if (!conflict) return;
    const alt = familyOptions("cards").filter((o) => !o.blocked).find(
      (o) => o.slug !== current && o.slug !== state.chapterCards[neighbors[0]] && o.slug !== state.chapterCards[neighbors[1]]
    );
    if (alt) {
      state.chapterCards[changedKey] = alt.slug;
      return alt.slug;
    }
    return null;
  }


  function seedChapterCards() {
    const cards = familyOptions("cards").filter((o) => !o.blocked);
    const keys = state.meta.chapterKeys;
    keys.forEach((key, i) => {
      if (state.chapterCards[key]) return;
      // Rotate so adjacent chapters differ (THM-04)
      const slug = cards[i % cards.length]?.slug || state.cardStyle;
      const prev = keys[i - 1];
      if (prev && state.chapterCards[prev] === slug && cards.length > 1) {
        state.chapterCards[key] = cards[(i + 1) % cards.length].slug;
      } else {
        state.chapterCards[key] = slug;
      }
    });
  }

  function stepLabel(step) {
    return step.id === "review" && !isLeadSession() ? "Review" : step.label;
  }

  /** Steps grouped by phase; the current phase is marked so the team always knows where it is. */
  function buildStepper() {
    const list = byId("stepList");
    list.innerHTML = "";
    const current = STEPS[state.step];
    PHASES.forEach(([phaseId, phaseLabel]) => {
      const group = document.createElement("li");
      group.className = "step-phase" + (current.phase === phaseId ? " is-current" : "");
      const heading = document.createElement("span");
      heading.className = "step-phase-label";
      heading.id = `phase-${phaseId}`;
      heading.textContent = phaseLabel;
      const steps = document.createElement("ol");
      steps.setAttribute("aria-labelledby", heading.id);
      STEPS.forEach((step, index) => {
        if (step.phase !== phaseId) return;
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        const label = stepLabel(step);
        btn.innerHTML = `<span class="step-num" aria-hidden="true">${index + 1}</span><span>${label}</span>`;
        btn.setAttribute("aria-label", `Step ${index + 1} of ${STEPS.length}: ${label}`);
        btn.title = label;
        if (index === state.step) btn.setAttribute("aria-current", "step");
        if (index < state.step) btn.classList.add("is-done");
        btn.addEventListener("click", () => {
          state.step = index;
          render();
        });
        li.appendChild(btn);
        steps.appendChild(li);
      });
      group.append(heading, steps);
      list.appendChild(group);
    });
    const meter = byId("stepProgress");
    if (meter) meter.style.setProperty("--progress", `${(state.step / (STEPS.length - 1)) * 100}%`);
  }

  /**
   * Selected state is never colour-only (A11Y-16): a check badge plus
   * visually-hidden "Selected" text accompany the border/ring styling.
   */
  function selectionMark(pressed) {
    const frag = document.createDocumentFragment();
    const check = document.createElement("span");
    check.className = "option-check";
    check.setAttribute("aria-hidden", "true");
    frag.appendChild(check);
    if (pressed) {
      const sr = document.createElement("span");
      sr.className = "sr-only";
      sr.textContent = "Selected";
      frag.appendChild(sr);
    }
    return frag;
  }

  function optionButton({ id, label, detail, usedBy, swatch, swatchClass, pressed, badge, fits, tryOn, onSelect, blocked, reason }) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option" + (blocked ? " is-blocked" : "");
    btn.setAttribute("aria-pressed", pressed ? "true" : "false");
    btn.dataset.id = id;
    if (blocked) {
      btn.disabled = true;
      btn.setAttribute("aria-disabled", "true");
      if (reason) btn.title = reason;
    }
    btn.appendChild(selectionMark(pressed));
    if (swatch || swatchClass) {
      const sw = document.createElement("div");
      sw.className = swatchClass ? `swatch ${swatchClass}` : "swatch";
      if (swatch) sw.style.background = swatch;
      btn.appendChild(sw);
    }
    const strong = document.createElement("strong");
    strong.textContent = label;
    btn.appendChild(strong);
    if (detail) {
      const small = document.createElement("small");
      small.textContent = detail;
      btn.appendChild(small);
    }
    if (fits || badge) {
      const tags = document.createElement("span");
      tags.className = "option-tags";
      if (fits) {
        const tag = document.createElement("span");
        tag.className = "fit-tag";
        tag.textContent = "Fits your brief";
        tags.appendChild(tag);
      }
      if (badge) {
        const tag = document.createElement("span");
        tag.className = "new-tag";
        tag.textContent = badge;
        tags.appendChild(tag);
      }
      btn.appendChild(tags);
    }
    if (usedBy && usedBy.length) {
      const tag = document.createElement("span");
      tag.className = "used-tag";
      tag.textContent = `Used by ${usedBy.join(", ")}`;
      btn.appendChild(tag);
    }
    if (blocked && reason) {
      const tag = document.createElement("span");
      tag.className = "blocked-tag";
      tag.textContent = reason;
      btn.appendChild(tag);
    }
    if (!blocked) {
      btn.addEventListener("click", onSelect);
      if (tryOn && !pressed) {
        const start = () => tryOnPreview(tryOn.field, tryOn.value, tryOn.view, label);
        btn.addEventListener("pointerenter", start);
        btn.addEventListener("focus", start);
        btn.addEventListener("pointerleave", endTryOn);
        btn.addEventListener("blur", endTryOn);
      }
    }
    return btn;
  }

  function briefContext() {
    const lesson = findMeta(state.meta.lessons, state.lessonId);
    return {
      meta: state.meta,
      library: state.library,
      lessonId: state.lessonId,
      lessonTitle: lesson ? lesson.title : state.lessonId,
      teamName: state.teamName
    };
  }

  function briefAnswers() {
    return Object.fromEntries(Object.keys(Brief.DEFAULT_BRIEF).map((key) => [key, state[key]]));
  }

  /** Slugs the brief ranks highest in one family; empty until the feel question is answered. */
  function briefFits(field, family) {
    return new Set(Brief.topPicks(briefContext(), briefAnswers(), field, family));
  }

  /**
   * Show an option on the Spokes Model without choosing it. State is swapped
   * and restored inside one synchronous call, so no save or autosave can see it.
   */
  function tryOnPreview(field, value, view, label) {
    tryOnDesign({ [field]: value }, view, label);
  }

  function tryOnDesign(values, view, label) {
    const previous = { ...Object.fromEntries(Object.keys(values).map((key) => [key, state[key]])), previewView: state.previewView };
    Object.assign(state, values, { previewView: view });
    ui.tryingOn = label;
    try { updatePreview(); }
    finally {
      Object.assign(state, previous);
      ui.tryingOn = null;
    }
  }

  function endTryOn() {
    updatePreview();
  }

  function renderLibraryOptions(grid, family, selectedSlug, onPick, { field, view, tryValue, swatchFor, swatchClassFor, showNew } = {}) {
    const fits = field === "chapterCards" ? briefFits("cardStyle", family) : field ? briefFits(field, family) : new Set();
    familyOptions(family).forEach((opt) => {
      grid.appendChild(
        optionButton({
          id: opt.id,
          label: opt.label,
          detail: opt.description || Brief.moodWords(family, opt.slug) || null,
          swatch: swatchFor ? swatchFor(opt) : null,
          swatchClass: swatchClassFor ? swatchClassFor(opt) : null,
          pressed: selectedSlug === opt.slug,
          badge: showNew && opt.legacy === false ? "New" : null,
          fits: fits.has(opt.slug),
          tryOn: field ? { field, value: tryValue ? tryValue(opt) : opt.slug, view: view || state.previewView } : null,
          blocked: Boolean(opt.blocked),
          reason: opt.reason || "",
          onSelect: () => onPick(opt)
        })
      );
    });
  }

  /** Three-band strip (lead gradient · sidebar tone · gold hairline) from the preset's defaults. */
  function presetSwatch(preset) {
    const cue = (state.meta.colorLeadPreview || {})[preset.defaults.colorLead] || {};
    const side = (state.meta.sidebarPreview || {})[preset.defaults.sidebarColor] || "var(--dark)";
    const strip = document.createElement("div");
    strip.className = "preset-swatch";
    strip.setAttribute("aria-hidden", "true");
    const lead = document.createElement("span");
    lead.style.background = `linear-gradient(135deg, ${cue.gradientFrom || "var(--primary)"}, ${cue.gradientTo || "var(--dark)"})`;
    const sidebar = document.createElement("span");
    sidebar.style.background = side;
    const gold = document.createElement("span");
    gold.className = "preset-swatch-gold";
    strip.append(lead, sidebar, gold);
    return strip;
  }

  function renderTeam(panel) {
    panel.innerHTML = `
      <h1>Lesson &amp; spokesperson</h1>
      <p class="panel-lead">One spokesperson saves the team’s decisions and prepares the file for Britt. Choose the lesson this file belongs to.</p>
      <div class="field-grid two">
        <label class="field">Lesson
          <select id="lessonSelect"></select>
        </label>
        <label class="field">Team name
          <input id="teamName" type="text" autocomplete="organization" placeholder="e.g. Money Management Team">
        </label>
        <label class="field">Spokesperson name
          <input id="spokespersonName" type="text" autocomplete="name" required placeholder="Your name">
        </label>
        <label class="field">Spokesperson email
          <input id="spokespersonEmail" type="email" autocomplete="email" placeholder="you@example.org">
        </label>
      </div>
    `;
    const select = byId("lessonSelect");
    state.meta.lessons.forEach((lesson) => {
      const opt = document.createElement("option");
      opt.value = lesson.id;
      opt.textContent = lesson.note ? `${lesson.title} (${lesson.note})` : lesson.title;
      if (lesson.id === state.lessonId) opt.selected = true;
      select.appendChild(opt);
    });
    if (ui.teamSession) {
      state.lessonId = ui.teamSession.lessonId;
      select.value = ui.teamSession.lessonId;
      select.disabled = true;
      select.title = "This private team session is locked to its assigned lesson.";
    }
    select.addEventListener("change", () => {
      if (ui.teamSession) return;
      state.lessonId = select.value;
      saveDraft();
      updatePreview();
    });
    const bind = (id, key) => {
      const input = byId(id);
      if (!input) return;
      input.value = state[key] || "";
      const sync = () => {
        state[key] = input.value;
        saveDraft();
        updatePreview();
      };
      input.addEventListener("input", sync);
      input.addEventListener("change", sync);
    };
    bind("teamName", "teamName");
    bind("spokespersonName", "spokespersonName");
    bind("spokespersonEmail", "spokespersonEmail");
  }

  function renderBrief(panel) {
    panel.innerHTML = `
      <h1>Describe the feel</h1>
      <p class="panel-lead">Four quick questions. Bespoke uses the answers, your lesson topic and your team name to put together a starting design that no other lesson has.</p>
      <div id="briefQuestions" class="brief-questions"></div>
    `;
    const host = byId("briefQuestions");
    Brief.QUESTIONS.forEach((q, qi) => {
      const block = document.createElement("section");
      block.className = "brief-question" + (qi === 0 ? " is-primary" : "");
      block.setAttribute("aria-labelledby", `${q.id}Label`);
      block.innerHTML = `<p class="group-label" id="${q.id}Label">${escapeHtml(q.prompt)}</p>`;
      const grid = document.createElement("div");
      grid.className = qi === 0 ? "option-grid brief-feel-grid" : "chip-row";
      grid.setAttribute("role", "group");
      grid.setAttribute("aria-labelledby", `${q.id}Label`);
      q.options.forEach((opt) => {
        const pressed = state[q.id] === opt.id;
        const choose = () => {
          state[q.id] = opt.id;
          state.briefVariant = 0;
          saveDraft();
          render();
        };
        if (qi === 0) {
          grid.appendChild(optionButton({ id: opt.id, label: opt.label, detail: opt.detail, pressed, onSelect: choose }));
          return;
        }
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        chip.setAttribute("aria-pressed", pressed ? "true" : "false");
        chip.textContent = opt.label;
        chip.addEventListener("click", choose);
        grid.appendChild(chip);
      });
      block.appendChild(grid);
      host.appendChild(block);
    });
  }

  /** The brief's suggested design, or null until the feel question is answered. */
  function currentSuggestion() {
    return Brief.suggestDesign(briefContext(), briefAnswers());
  }

  function designMatches(picks) {
    return Brief.FIELDS.every(([field]) => state[field] === picks[field]);
  }

  function applySuggestion(suggestion) {
    if (!isLeadSession() || !suggestion) return;
    Object.assign(state, suggestion.picks);
    state.presetId = suggestion.basePreset;
    if (!state.varyCardsByChapter) state.chapterCards = {};
    const feel = Brief.answer("briefFeel", state.briefFeel);
    noteChange("Made from your brief", `${feel ? feel.label : "Your answers"} — everything stays editable.`, true);
  }

  function suggestionSwatch(picks) {
    return presetSwatch({ defaults: { colorLead: picks.colorLead, sidebarColor: picks.sidebarColor } });
  }

  function renderSuggestionCard(host) {
    const suggestion = currentSuggestion();
    const card = document.createElement("section");
    card.className = "brief-card";
    card.setAttribute("aria-labelledby", "briefCardTitle");
    if (!suggestion) {
      card.classList.add("is-empty");
      card.innerHTML = `
        <h2 id="briefCardTitle">Get a design made for your team</h2>
        <p>Answer the four questions in <strong>Describe the feel</strong> and Bespoke builds a starting design from them.</p>
        <button type="button" class="btn btn-secondary" id="btnGoBrief">Describe the feel</button>`;
      host.appendChild(card);
      byId("btnGoBrief").addEventListener("click", () => { state.step = stepIndex("brief"); render(); });
      return;
    }
    const feel = Brief.answer("briefFeel", state.briefFeel);
    const inUse = designMatches(suggestion.picks);
    const near = suggestion.closest;
    card.innerHTML = `
      <div class="brief-card-head">
        <div>
          <h2 id="briefCardTitle">Made for your team</h2>
          <p>Built for a <strong>${escapeHtml(feel.label.toLowerCase())}</strong> lesson. Shares ${near.shared} of ${near.total} choices with ${escapeHtml(near.lesson)}, its closest existing lesson.</p>
        </div>
      </div>
      <div class="brief-card-actions">
        ${inUse
          ? `<p class="brief-in-use"><span class="option-check" aria-hidden="true"></span>In use. Fine-tune it on the next steps.</p>
             <button type="button" class="btn btn-secondary" id="btnBriefAnother">Try another version</button>`
          : `<button type="button" class="btn btn-primary" id="btnBriefUse">Use this design</button>
             <button type="button" class="btn btn-ghost" id="btnBriefAnother">Show another version</button>`}
      </div>
      <ul class="brief-picks" id="briefPicks"></ul>`;
    card.querySelector(".brief-card-head").prepend(suggestionSwatch(suggestion.picks));
    const list = card.querySelector("#briefPicks");
    suggestion.explained.forEach((item) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${escapeHtml(item.name)}</span><strong>${escapeHtml(item.label)}</strong>${item.why ? `<small>${escapeHtml(item.why)}</small>` : ""}`;
      list.appendChild(li);
    });
    host.appendChild(card);
    const useBtn = byId("btnBriefUse");
    if (useBtn) {
      const start = () => tryOnDesign(suggestion.picks, state.previewView, "the design made for your team");
      useBtn.addEventListener("pointerenter", start);
      useBtn.addEventListener("focus", start);
      useBtn.addEventListener("pointerleave", endTryOn);
      useBtn.addEventListener("blur", endTryOn);
    }
    byId("btnBriefUse")?.addEventListener("click", () => {
      applySuggestion(suggestion);
      saveDraft();
      render();
    });
    byId("btnBriefAnother")?.addEventListener("click", () => {
      state.briefVariant = (state.briefVariant || 0) + 1;
      // Already using the brief design: move straight to the next version so the preview changes.
      if (inUse) applySuggestion(currentSuggestion());
      saveDraft();
      render();
    });
  }

  function renderPreset(panel) {
    panel.innerHTML = `
      <h1>Starting point</h1>
      <p class="panel-lead">${isLeadSession()
        ? "Start from the design made for your team, or from an existing lesson’s look. Every choice stays editable on the next steps."
        : "This is the starting point in the shared design."}</p>
      <div id="briefCardHost"></div>
      <p class="group-label" id="presetLabel">Or start from an existing lesson’s look</p>
      <div class="preset-grid" id="presetGrid" role="group" aria-labelledby="presetLabel"></div>
    `;
    renderSuggestionCard(byId("briefCardHost"));
    const grid = byId("presetGrid");
    state.meta.presets.forEach((preset) => {
      // Selected only while the design is still exactly this lesson's look.
      const pressed = designMatches(preset.defaults);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "preset";
      btn.dataset.id = preset.id;
      btn.setAttribute("aria-pressed", pressed ? "true" : "false");
      btn.appendChild(selectionMark(pressed));
      btn.appendChild(presetSwatch(preset));
      const strong = document.createElement("strong");
      strong.textContent = preset.label;
      const small = document.createElement("small");
      small.textContent = preset.blurb;
      const lesson = document.createElement("span");
      lesson.className = "used-tag";
      lesson.textContent = `Same look as ${Brief.PRESET_LESSONS[preset.id] || "an existing lesson"}`;
      btn.append(strong, small, lesson);
      btn.addEventListener("click", () => {
        applyPreset(preset.id);
        saveDraft();
        render();
      });
      grid.appendChild(btn);
    });
  }

  function renderColor(panel) {
    panel.innerHTML = `
      <h1>Color lead</h1>
      <p class="panel-lead">The lead colors slide headings, the rule under titles, buttons, and Gradient Sweep dividers. The preview opens on a content slide, where it shows most. The title slide background comes from your <em>Title slide</em> choice, so it may not change here. Leads used by earlier lessons are marked.</p>
      <div class="option-grid" id="colorGrid" role="group" aria-label="Color leads"></div>
    `;
    const grid = byId("colorGrid");
    const cues = state.meta.colorLeadPreview || {};
    const fits = briefFits("colorLead", "colorLeads");
    familyOptions("colorLeads").forEach((opt) => {
      const cue = cues[opt.slug] || {};
      grid.appendChild(
        optionButton({
          id: opt.id,
          label: opt.label,
          detail: Brief.moodWords("colorLeads", opt.slug) || null,
          usedBy: cue.usedBy,
          fits: fits.has(opt.slug),
          tryOn: { field: "colorLead", value: opt.slug, view: state.previewView },
          swatch: `linear-gradient(135deg, ${cue.gradientFrom || "var(--primary)"}, ${cue.gradientTo || "var(--dark)"})`,
          pressed: state.colorLead === opt.slug,
          blocked: Boolean(opt.blocked),
          reason: opt.reason || "",
          onSelect: () => {
            state.colorLead = opt.slug;
            noteChange("Color lead", opt.label);
            saveDraft();
            render();
          }
        })
      );
    });
  }

  function renderSurface(panel) {
    panel.innerHTML = `
      <h1>Sidebar &amp; background</h1>
      <p class="panel-lead">The chapter sidebar tone and the background behind content slides. The preview opens on a content slide because the title slide covers the background. The patterns are subtle by design and show more on a projector. Dark Royal flips the whole lesson to a dark theme.</p>
      <p class="group-label" id="sidebarLabel">Sidebar</p>
      <div class="option-grid" id="sidebarGrid" role="group" aria-labelledby="sidebarLabel"></div>
      <p class="group-label" id="textureLabel">Background</p>
      <div class="option-grid" id="textureGrid" role="group" aria-labelledby="textureLabel"></div>
    `;
    const sidePreview = state.meta.sidebarPreview || {};
    renderLibraryOptions(byId("sidebarGrid"), "sidebarColors", state.sidebarColor, (opt) => {
      state.sidebarColor = opt.slug;
      noteChange("Sidebar", opt.label);
      saveDraft();
      render();
    }, { field: "sidebarColor", view: "title", swatchFor: (opt) => sidePreview[opt.slug] || "var(--dark)" });
    renderLibraryOptions(byId("textureGrid"), "backgroundTextures", state.backgroundTexture, (opt) => {
      state.backgroundTexture = opt.slug;
      noteChange("Background", opt.label);
      saveDraft();
      render();
    }, { field: "backgroundTexture", view: "title", swatchClassFor: (opt) => `swatch-texture is-texture-${opt.slug}` });
  }

  function renderLayouts(panel) {
    panel.innerHTML = `
      <h1>Title &amp; dividers</h1>
      <p class="panel-lead">How the opening slide and each chapter's divider look. Watch the preview switch as you pick.</p>
      <p class="group-label" id="titleLabel">Title slide</p>
      <div class="option-grid" id="titleGrid" role="group" aria-labelledby="titleLabel"></div>
      <p class="group-label" id="dividerLabel">Section divider</p>
      <div class="option-grid" id="dividerGrid" role="group" aria-labelledby="dividerLabel"></div>
    `;
    renderLibraryOptions(byId("titleGrid"), "titleSlides", state.titleSlide, (opt) => {
      state.titleSlide = opt.slug;
      showView("title");
      noteChange("Title slide", opt.label);
      saveDraft();
      render();
    }, { field: "titleSlide", view: "title", showNew: true });
    renderLibraryOptions(byId("dividerGrid"), "dividers", state.dividerStyle, (opt) => {
      state.dividerStyle = opt.slug;
      showView("divider");
      noteChange("Divider", opt.label);
      saveDraft();
      render();
    }, { field: "dividerStyle", view: "divider", showNew: true });
  }

  /**
   * Cards: the grid always edits what the preview shows. Lesson-wide normally;
   * with "Vary by chapter" on, the chapter picked in the chapter row.
   */
  function renderCards(panel) {
    const vary = state.varyCardsByChapter;
    const keys = state.meta.chapterKeys;
    if (!keys.includes(ui.cardChapter)) ui.cardChapter = "P1";
    const chapterName = (key) => (CHAPTERS.find(([k]) => k === key) || [key, key])[1];
    const editing = ui.cardChapter;
    panel.innerHTML = `
      <h1>Cards</h1>
      <p class="panel-lead">The card style for content slides. Turn on <em>Vary by chapter</em> to give each WIPPEA stage its own look; neighbouring chapters always differ.</p>
      <div class="toggle-row">
        <input type="checkbox" id="varyCards" ${vary ? "checked" : ""}>
        <label for="varyCards">
          <strong>Vary by chapter</strong><br>
          <span class="toggle-hint">A different card style for each WIPPEA stage.</span>
        </label>
      </div>
      ${vary ? `
      <p class="group-label" id="chapterPickLabel">Chapter to style</p>
      <div class="chapter-picks" id="chapterPicks" role="group" aria-labelledby="chapterPickLabel"></div>
      <p id="thmNote" class="card-note" role="status">${escapeHtml(ui.cardNote)}</p>` : ""}
      <p class="group-label" id="cardGridLabel">${vary ? `Card style for ${escapeHtml(editing)} · ${escapeHtml(chapterName(editing))}` : "Card style for every chapter"}</p>
      <div class="option-grid" id="cardGrid" role="group" aria-labelledby="cardGridLabel"></div>
    `;
    ui.cardNote = "";

    const selected = vary ? state.chapterCards[editing] || state.cardStyle : state.cardStyle;
    renderLibraryOptions(byId("cardGrid"), "cards", selected, (opt) => {
      if (vary) {
        state.chapterCards = { ...state.chapterCards, [editing]: opt.slug };
        const adjusted = enforceAdjacentCardUniqueness(editing);
        if (adjusted && adjusted !== opt.slug) {
          ui.cardNote = `${opt.label} matches a neighbouring chapter, so ${editing} uses ${findOption("cards", adjusted)?.label || adjusted} instead.`;
        }
        noteChange(`Chapter ${editing} cards`, findOption("cards", state.chapterCards[editing])?.label || state.chapterCards[editing]);
      } else {
        state.cardStyle = opt.slug;
        noteChange("Card style", opt.label);
      }
      showView("cards");
      saveDraft();
      render();
    }, vary
      ? { field: "chapterCards", view: "cards", showNew: true, tryValue: (opt) => ({ ...state.chapterCards, [editing]: opt.slug }) }
      : { field: "cardStyle", view: "cards", showNew: true });

    byId("varyCards").addEventListener("change", (e) => {
      state.varyCardsByChapter = e.target.checked;
      if (state.varyCardsByChapter) seedChapterCards();
      showView("cards");
      noteChange("Vary by chapter", state.varyCardsByChapter ? "On" : "Off");
      saveDraft();
      render();
    });

    const picks = byId("chapterPicks");
    if (!picks) return;
    keys.forEach((key) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chapter-pick";
      btn.setAttribute("aria-pressed", key === editing ? "true" : "false");
      const label = findOption("cards", state.chapterCards[key] || state.cardStyle)?.label || state.chapterCards[key];
      btn.setAttribute("aria-label", `Chapter ${key}, ${chapterName(key)}: ${label}`);
      btn.innerHTML = `<strong>${escapeHtml(key)}</strong><small>${escapeHtml(label)}</small>`;
      btn.addEventListener("click", () => {
        ui.cardChapter = key;
        showView("cards");
        render();
      });
      picks.appendChild(btn);
    });
  }

  function renderFonts(panel) {
    panel.innerHTML = `
      <h1>Fonts</h1>
      <p class="panel-lead">Heading and body typefaces, self-hosted so they work offline and behind school filters.</p>
      <div class="option-grid" id="fontGrid" role="group" aria-label="Font pairings"></div>
    `;
    const grid = byId("fontGrid");
    const fits = briefFits("fontPairing", "fonts");
    state.meta.fontPairings.forEach((item) => {
      grid.appendChild(
        optionButton({
          id: item.id,
          label: item.label,
          detail: item.mood,
          pressed: state.fontPairing === item.id,
          fits: fits.has(item.id),
          tryOn: { field: "fontPairing", value: item.id, view: state.previewView },
          onSelect: () => {
            state.fontPairing = item.id;
            noteChange("Fonts", item.label);
            saveDraft();
            render();
          }
        })
      );
    });
  }

  function renderContent(panel) {
    const lesson = findMeta(state.meta.lessons, state.lessonId);
    panel.innerHTML = `
      <h1>Try sample text</h1>
      <p class="panel-lead">Optional: try a title or a few sample lines to compare the look and fit. You can keep the supplied examples. This step does not collect your lesson content.</p>
      <div class="field-grid">
        <label class="field">Lesson title
          <input id="lessonTitle" type="text" placeholder="${lesson ? lesson.title : "Lesson title"}">
        </label>
        <label class="field">Subtitle
          <input id="lessonSubtitle" type="text" placeholder="Short phrase under the title">
        </label>
        <label class="field">Key points (one per line — become cards)
          <textarea id="sampleBullets"></textarea>
        </label>
        <label class="field">Myth / reality pair (card detail and takeaway)
          <textarea id="sampleMyth"></textarea>
        </label>
      </div>
    `;
    const bind = (id, key) => {
      const input = byId(id);
      if (!input) return;
      input.value = state[key] || "";
      const sync = () => {
        state[key] = input.value;
        saveDraft();
        updatePreview();
      };
      input.addEventListener("input", sync);
      input.addEventListener("change", sync);
    };
    bind("lessonTitle", "lessonTitle");
    bind("lessonSubtitle", "lessonSubtitle");
    bind("sampleBullets", "sampleBullets");
    bind("sampleMyth", "sampleMyth");
  }

  function renderReview(panel) {
    const labels = selectionLabels();
    const lead = isLeadSession();
    panel.innerHTML = `
      <h1>${lead ? "Review &amp; submit" : "Review"}</h1>
      <p class="panel-lead">${lead
        ? "Check your choices, then choose Send to Britt. Britt reviews the visual choices. Lesson building starts later, after the content is approved and the work is authorized."
        : "This is a shared snapshot. You can look through every step. It does not update when the lead makes changes."}</p>
      <div class="review-distinct" id="reviewDistinct"></div>
      ${lead ? `
      <section class="share-card" aria-labelledby="shareTitle">
        <h2 id="shareTitle">Share this design</h2>
        <p id="shareHelp">This optional link is a read-only snapshot: later changes need a new link. It includes the design, sample text and team contact details; anyone with it can read them. Use the separate private team access link to edit and save.</p>
        <div class="share-actions">
          <button type="button" class="btn btn-primary btn-lg" id="btnCopyView" aria-describedby="shareHelp">Copy view link for your team</button>
        </div>
        <p id="shareStatus" class="share-status" role="status" aria-live="polite"></p>
        <label class="field share-link-fallback" id="shareLinkFallback" hidden>
          Link
          <input id="shareLinkField" type="text" readonly>
        </label>
      </section>` : ""}
      <ul class="summary-list" id="summaryList"></ul>
      ${lead ? `
      <section class="next-hops" aria-labelledby="nextHopsTitle">
        <h2 id="nextHopsTitle">What happens next</h2>
        <ol>
          <li>Choose <strong>Save shared design</strong> so the team can return to this revision.</li>
          <li>Choose <strong>Send to Britt</strong> when the team agrees. You do not sign in or pick a folder.</li>
          <li>Britt reviews the visual choices. Lesson building starts later, after content approval and authorization.</li>
          <li>Your team checks that the approved look appears in the finished lesson.</li>
        </ol>
        <p class="next-hops-note">Coming back later? Open the same private team link; this browser also remembers the last team. Download backup is always available.</p>
        <p class="next-hops-note">The builder chooses slide pieces for the content. Your card style applies wherever cards appear.</p>
      </section>` : ""}
      <label class="field unspoken-field">Unspoken — something we wish existed in the library
        <textarea id="unspoken" placeholder="Optional wish-list for future library pieces"></textarea>
      </label>
      <details class="builder-note"${ui.builderNote ? " open" : ""}>
        <summary>For builders</summary>
        <p class="builder-instructor-note">Britt and builders only. Instructors use shared Save, team Open, backup, and Send to Britt.</p><button type="button" class="btn btn-secondary" id="btnBuilderIssue">Prepare GitHub issue</button>
        <div class="builder-files">
          <button type="button" class="btn btn-secondary" id="btnDownloadDesign">Download design file</button>
          <button type="button" class="btn btn-secondary" id="btnOpenDesign">Open a design file</button>
          <input id="importSelection" class="builder-file-input" type="file" accept="application/json,.json" tabindex="-1" aria-hidden="true">
          <button type="button" class="btn btn-secondary" id="btnCopySelection">Copy design file</button>
        </div>
        <p id="builderFileStatus" class="share-status" role="status" aria-live="polite">${escapeHtml(ui.builderNote || "")}</p>
        <dl id="builderDetails"></dl>
        <p>Options load from <code>SPOKES Builder/bespoke-library-catalog.json</code> (UI key <code>{family}.{slug}</code>); the selection payload stores <strong>slugs only</strong>. <code>bespoke-apply-selection.py</code> upserts <code>theme-registry.json</code> with derived Layer 2 fields below. Card styles may vary by WIPPEA chapter (D12); adjacent chapters never share a style (THM-04). A view link (<code>#v=</code>) is a read-only compressed snapshot and is separate from the private team access link. View URLs longer than ${SHARE_URL_MAX} characters are not copied. Visual reference: <a href="../SPOKES%20Builder/library-preview.html" target="_blank" rel="noopener">library preview</a>.</p>
      </details>
    `;
    renderDistinctSummary(byId("reviewDistinct"));
    const list = byId("summaryList");
    Object.entries(labels).forEach(([k, v]) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${k}</span><strong>${escapeHtml(v)}</strong>`;
      list.appendChild(li);
    });
    const details = byId("builderDetails");
    Object.entries(builderIds()).forEach(([k, v]) => {
      const dt = document.createElement("dt");
      dt.textContent = k;
      const dd = document.createElement("dd");
      dd.innerHTML = `<code>${escapeHtml(v)}</code>`;
      details.append(dt, dd);
    });
    const unspoken = byId("unspoken");
    if (unspoken) {
      unspoken.value = state.unspoken || "";
      unspoken.addEventListener("input", () => {
        if (!isLeadSession()) return;
        state.unspoken = unspoken.value;
        saveDraft();
      });
    }
    byId("btnBuilderIssue")?.addEventListener("click", () => {
      const payload = buildSelectionPayload();
      if (!payload.team.spokesperson.name) { fileNotice("Add a spokesperson before submitting."); return; }
      const url = `https://github.com/${REPO}/issues/new?title=${encodeURIComponent(`[Spoke Signal] ${payload.lesson.id} — ${payload.date}`)}&labels=spoke-signal,bespoke&body=${encodeURIComponent(buildIssueBody(payload))}`;
      if (url.length > 7000) { fileNotice("Use the downloaded file with the submission script; this issue URL is too long."); return; }
      const link = document.createElement("a");
      link.href = url; link.target = "_blank"; link.rel = "noopener"; link.textContent = "Open prepared GitHub issue";
      const status = byId("builderFileStatus"); status.replaceChildren(link);
    });
    byId("btnCopyView")?.addEventListener("click", () => copyLink());
    byId("btnDownloadDesign")?.addEventListener("click", () => saveTeamFile());
    byId("btnOpenDesign")?.addEventListener("click", () => byId("teamFileInput").click());
    byId("btnCopySelection")?.addEventListener("click", async () => {
      if (!isLeadSession()) return;
      const status = byId("builderFileStatus");
      try {
        await navigator.clipboard.writeText(JSON.stringify(buildSelectionPayload(), null, 2));
        if (status) status.textContent = "Copied the design file.";
      } catch {
        if (status) status.textContent = "Could not copy. Download the design file instead.";
      }
    });
  }

  /** Plain statement of how this design relates to the six existing lessons. */
  function renderDistinctSummary(host) {
    if (!host) return;
    const near = Brief.distinctness(state.meta, state);
    const feel = Brief.answer("briefFeel", state.briefFeel);
    const verdict = near.shared === near.total
      ? `This is the same look as ${near.lesson}. Change a few choices if the team wants its own look.`
      : `Closest existing lesson: ${near.lesson}, sharing ${near.shared} of ${near.total} choices.`;
    host.innerHTML = `
      ${distinctPips(near)}
      <p><strong>${escapeHtml(verdict)}</strong>${feel ? ` Brief: ${escapeHtml(feel.label.toLowerCase())}.` : ""}</p>`;
  }

  /** Seven marks, filled for each choice shared with the closest existing lesson. */
  function distinctPips(near) {
    const pips = Array.from({ length: near.total }, (_, i) => `<span${i < near.shared ? ' class="is-shared"' : ""}></span>`).join("");
    return `<span class="distinct-pips" aria-hidden="true">${pips}</span>`;
  }

  async function copyLink() {
    if (!isLeadSession()) return;
    const status = byId("shareStatus");
    const button = byId("btnCopyView");
    if (button) button.disabled = true;
    try {
      const result = await buildViewUrl();
      if (!result.url) {
        if (status) status.textContent = result.message;
        return;
      }
      try {
        await navigator.clipboard.writeText(result.url);
        if (status) status.textContent = result.message;
      } catch {
        const fallback = byId("shareLinkFallback");
        const field = byId("shareLinkField");
        if (fallback && field) {
          fallback.hidden = false;
          field.value = result.url;
          field.focus();
          field.select();
        }
        if (status) status.textContent = "Could not copy automatically. Select the link below.";
      }
    } finally {
      if (button) button.disabled = false;
    }
  }

  function selectionLabels() {
    const lesson = findMeta(state.meta.lessons, state.lessonId);
    const preset = findMeta(state.meta.presets, state.presetId);
    const cardLabel = (slug) => findOption("cards", slug)?.label || slug;
    return {
      Lesson: lesson ? lesson.title : state.lessonId,
      Team: state.teamName || "—",
      Spokesperson: state.spokespersonName || "—",
      "Theme preset": preset ? preset.label : state.presetId,
      "Color lead": findOption("colorLeads", state.colorLead)?.label || state.colorLead,
      Sidebar: findOption("sidebarColors", state.sidebarColor)?.label || state.sidebarColor,
      Background: findOption("backgroundTextures", state.backgroundTexture)?.label || state.backgroundTexture,
      "Title slide": findOption("titleSlides", state.titleSlide)?.label || state.titleSlide,
      Divider: findOption("dividers", state.dividerStyle)?.label || state.dividerStyle,
      Cards: state.varyCardsByChapter
        ? `Vary by chapter — ${state.meta.chapterKeys
            .map((k) => `${k}: ${cardLabel(state.chapterCards[k] || state.cardStyle)}`)
            .join(", ")}`
        : cardLabel(state.cardStyle),
      Fonts: findMeta(state.meta.fontPairings, state.fontPairing)?.label || state.fontPairing
    };
  }

  /** Catalog ids for the collapsed "For builders" footnote on Review. */
  const DERIVED_LAYER2 = {
    W: { leadComponent: "takeaways", secondaryAccent: "gold" },
    I: { leadComponent: "cards-grid", secondaryAccent: "primary" },
    P1: { leadComponent: "smart-stack", secondaryAccent: "gold" },
    P2: { leadComponent: "areas-grid", secondaryAccent: "primary" },
    P3: { leadComponent: "dangers-grid", secondaryAccent: "gold" },
    E: { leadComponent: "takeaways", secondaryAccent: "primary" },
    A: { leadComponent: "content-list", secondaryAccent: "gold" }
  };

  function builderIds() {
    const derived = (state.meta.chapterKeys || Object.keys(DERIVED_LAYER2))
      .map((k) => {
        const d = DERIVED_LAYER2[k] || {};
        return `${k}: ${d.leadComponent}/${d.secondaryAccent}`;
      })
      .join("; ");
    return {
      Preset: state.presetId,
      "Color lead": uiKey("colorLeads", state.colorLead),
      Sidebar: uiKey("sidebarColors", state.sidebarColor),
      Background: uiKey("backgroundTextures", state.backgroundTexture),
      "Title slide": uiKey("titleSlides", state.titleSlide),
      Divider: uiKey("dividers", state.dividerStyle),
      Cards: state.varyCardsByChapter
        ? state.meta.chapterKeys.map((k) => `${k}=${uiKey("cards", state.chapterCards[k] || state.cardStyle)}`).join(" ")
        : uiKey("cards", state.cardStyle),
      Fonts: state.fontPairing,
      "Derived Layer 2 (FID-5)": derived,
      "Registry key": state.lessonId ? `lesson-${state.lessonId}` : "—"
    };
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderWelcome(panel) {
    panel.innerHTML = `
      <h1>Design your lesson together</h1>
      <p class="panel-lead">One team member operates Bespoke and shares their screen during your Teams call. Everyone helps choose the look.</p>
      <ol class="guide-list">
        <li><strong>Returning?</strong> Open your private team access link. This browser remembers the last team session for an easier return.</li>
        <li><strong>Starting?</strong> Use the private link Britt or your administrator gave the team. It locks this workspace to the right lesson.</li>
        <li><strong>Finishing the meeting?</strong> Choose <strong>Save shared design</strong>. Download backup is always available too.</li>
        <li><strong>Ready for Britt?</strong> Choose <strong>Send to Britt</strong>. You do not sign in or pick a folder.</li>
      </ol>
      <p>Your browser keeps a working draft. Shared Save is the durable team copy. Keep the private access link inside the team.</p>
      <p><a href="./team-guide.html" target="_blank" rel="noopener">Team meeting guide</a></p>`;
  }

  function renderPanel() {
    const panel = byId("stepPanel");
    const id = STEPS[state.step].id;
    const renderers = {
      welcome: renderWelcome,
      team: renderTeam,
      preset: renderPreset,
      color: renderColor,
      surface: renderSurface,
      layouts: renderLayouts,
      cards: renderCards,
      fonts: renderFonts,
      content: renderContent,
      review: renderReview,
      brief: renderBrief
    };
    renderers[id](panel);

    const next = STEPS[state.step + 1];
    const nav = document.createElement("div");
    nav.className = "panel-nav";
    nav.innerHTML = `
      <button type="button" class="btn btn-secondary" id="btnBack"${state.step === 0 ? " disabled" : ""}>Back</button>
      <div class="panel-nav-forward">
        ${next ? `<button type="button" class="btn btn-primary" id="btnNext">Next<span class="next-label">: ${escapeHtml(stepLabel(next))}</span></button>` : ""}
        ${
          id === "review" && isLeadSession()
            ? `<button type="button" class="btn btn-accent btn-lg" id="btnSubmit">Send to Britt</button>`
            : ""
        }
      </div>
    `;
    panel.appendChild(nav);
    byId("btnBack")?.addEventListener("click", () => {
      state.step = Math.max(0, state.step - 1);
      render();
    });
    byId("btnNext")?.addEventListener("click", () => {
      if (!validateCurrentStep()) return;
      state.step = Math.min(STEPS.length - 1, state.step + 1);
      render();
    });
    byId("btnSubmit")?.addEventListener("click", onSubmit);
  }

  function syncTeamFieldsFromDom() {
    const map = [
      ["teamName", "teamName"],
      ["spokespersonName", "spokespersonName"],
      ["spokespersonEmail", "spokespersonEmail"],
      ["lessonSelect", "lessonId"]
    ];
    map.forEach(([domId, key]) => {
      const el = byId(domId);
      if (el) state[key] = el.value;
    });
  }

  function validateCurrentStep() {
    if (!isLeadSession()) return true;
    const id = STEPS[state.step].id;
    if (id === "team") {
      syncTeamFieldsFromDom();
      if (!state.spokespersonName.trim()) {
        alert("Spoke Too Soon — add the spokesperson’s name before continuing.");
        return false;
      }
      if (!state.lessonId) {
        alert("Spoke Too Soon — pick a lesson.");
        return false;
      }
    }
    if (id === "content") {
      ["lessonTitle", "lessonSubtitle", "sampleBullets", "sampleMyth"].forEach((fieldId) => {
        const el = byId(fieldId);
        if (el) state[fieldId] = el.value;
      });
    }
    return true;
  }

  function applyLeadVars() {
    const cue = (state.meta.colorLeadPreview || {})[state.colorLead] || {};
    const root = document.documentElement;
    root.style.setProperty("--lead-heading", cue.heading || "var(--primary)");
    root.style.setProperty("--lead-button", cue.button || "var(--primary)");
    root.style.setProperty("--lead-from", cue.gradientFrom || "var(--primary)");
    root.style.setProperty("--lead-to", cue.gradientTo || "var(--dark)");
    const side = (state.meta.sidebarPreview || {})[state.sidebarColor] || "var(--dark)";
    root.style.setProperty("--sidebar-tone", side);
    const fonts = findMeta(state.meta.fontPairings, state.fontPairing);
    if (fonts) {
      root.style.setProperty("--model-heading", `"${fonts.heading}", Georgia, serif`);
      root.style.setProperty("--model-body", `"${fonts.body}", system-ui, sans-serif`);
    }
  }

  function lessonDisplayTitle() {
    if (state.lessonTitle.trim()) return state.lessonTitle.trim();
    const lesson = findMeta(state.meta.lessons, state.lessonId);
    return lesson ? lesson.title : "Lesson title";
  }

  function parseBullets(text) {
    return String(text || "")
      .split(/\n+/)
      .map((line) => line.replace(/^\s*\d+[.)]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 4);
  }

  /** Lesson chrome shown on every view: chapter list, current chapter, slide counter. */
  const CHAPTERS = [
    ["W", "Warm-Up"],
    ["I", "Introduction"],
    ["P1", "Presentation 1"],
    ["P2", "Presentation 2"],
    ["P3", "Presentation 3"],
    ["E", "Evaluation"],
    ["A", "Application"]
  ];
  const VIEW_CHROME = {
    title: { chapter: "W", slide: 1 },
    divider: { chapter: "P1", slide: 9 },
    cards: { chapter: "P1", slide: 10 }
  };
  function renderModelSidebar(title) {
    const base = VIEW_CHROME[state.previewView] || VIEW_CHROME.title;
    const chrome = state.previewView === "cards" ? { ...base, chapter: contentChapter().key } : base;
    const rows = CHAPTERS.map(
      ([key, name]) =>
        `<li${key === chrome.chapter ? ' class="is-current"' : ""}><span class="ms-letter">${key}</span><span class="ms-name">${name}</span></li>`
    ).join("");
    return `<div class="ms-title">${escapeHtml(title)}</div><ol class="ms-chapters">${rows}</ol><div class="ms-counter">Slide ${chrome.slide} of 30</div>`;
  }


  const PREVIEW_CHAPTER = "3";
  const PREVIEW_CHAPTER_NUM = "P1";

  /** The chapter the content preview shows: the one being edited when cards vary, else P1. */
  function contentChapter() {
    const keys = state.meta.chapterKeys;
    const key = state.varyCardsByChapter && keys.includes(ui.cardChapter) ? ui.cardChapter : "P1";
    return { key, num: String(keys.indexOf(key) + 1), slug: state.varyCardsByChapter ? state.chapterCards[key] || state.cardStyle : state.cardStyle };
  }

  function themeOption(family, slug) {
    const sections = state.themeOptions?.sections || [];
    for (const section of sections) {
      if ((section.family || section.id) !== family) continue;
      const hit = (section.options || []).find((o) => o.slug === slug);
      if (hit) return hit;
    }
    return null;
  }

  function scopeCss(css, scopePrefix) {
    return String(css || "")
      .replace(/\bSCOPE\b/g, scopePrefix)
      .replace(/\bDIVIDER_SCOPE\b/g, scopePrefix);
  }

  function prefixSelectors(css, prefix) {
    const trimmed = String(css || "").trim();
    if (!trimmed) return "";
    return trimmed.replace(/(^|})\s*([^@}/][^{]*)\{/g, (match, brace, selectors) => {
      const scoped = selectors
        .split(",")
        .map((sel) => {
          const s = sel.trim();
          if (!s) return s;
          if (s.startsWith(prefix.trim())) return s;
          return `${prefix}${s}`;
        })
        .join(", ");
      return `${brace}\n${scoped} {`;
    });
  }

  function ensureInjectStyle() {
    let el = document.getElementById("bespoke-theme-inject");
    if (!el) {
      el = document.createElement("style");
      el.id = "bespoke-theme-inject";
      document.head.appendChild(el);
    }
    return el;
  }

  function buildInjectedThemeCss() {
    const main = ".spokes-model .model-main";
    const chapterScope = `${main} [data-chapter="${contentChapter().num}"]`;
    const dividerScope = `${main} .slide-section[data-chapter="${PREVIEW_CHAPTER}"]`;
    const chunks = [];

    const texture = themeOption("backgroundTextures", state.backgroundTexture);
    if (texture && texture.css) {
      chunks.push(String(texture.css).replace(/\.main\b/g, main));
    }

    const lead = themeOption("colorLeads", state.colorLead);
    if (lead && lead.css) {
      chunks.push(prefixSelectors(lead.css, main + " "));
    }

    const titleOpt = themeOption("titleSlides", state.titleSlide);
    if (titleOpt && titleOpt.css) {
      chunks.push(prefixSelectors(titleOpt.css, main + " "));
    }

    const divider = themeOption("dividers", state.dividerStyle);
    if (divider && divider.css) {
      chunks.push(scopeCss(divider.css, dividerScope));
    }

    const card = themeOption("cards", contentChapter().slug);
    if (card && card.css) {
      chunks.push(scopeCss(card.css, chapterScope));
    }

    if (state.backgroundTexture === "dark-royal") {
      const darkSection = (state.themeOptions && state.themeOptions.sections || []).find((s) => s.id === "darkTheme");
      for (const opt of (darkSection && darkSection.options) || []) {
        if (!opt.css) continue;
        chunks.push(String(opt.css).replace(/\.theme-dark\b/g, main + ".theme-dark"));
      }
    }

    return chunks.filter(Boolean).join("\n\n");
  }

  /** Texture tiles draw each option's own library CSS, so a tile shows the real pattern. */
  function injectTextureSwatches() {
    const section = (state.themeOptions?.sections || []).find((s) => (s.family || s.id) === "backgroundTextures");
    const style = document.createElement("style");
    style.id = "bespoke-texture-swatches";
    style.textContent = (section?.options || [])
      .map((o) => String(o.css || "").replace(/\.main\b/g, `.option .swatch-texture.is-texture-${o.slug}`))
      .join("\n");
    document.head.appendChild(style);
  }

  /**
   * Library snippets are written for a full-size lesson (px and rem). Express each
   * length as a multiple of the frame's --pv-px / --pv-rem so the preview is that
   * lesson scaled down, not a full-size layout squeezed into a small box.
   */
  function scaleLibraryUnits(css) {
    return css.replace(/(^|[^\w.#-])(-?\d*\.?\d+)(px|rem)\b/g, (match, lead, value, unit) => `${lead}calc(${value} * var(--pv-${unit}))`);
  }

  function injectPreviewTheme() {
    ensureInjectStyle().textContent = scaleLibraryUnits(buildInjectedThemeCss());
  }

  function updatePreview() {
    applyLeadVars();
    injectPreviewTheme();
    const main = byId("modelMain");
    const sidebar = byId("modelSidebar");
    const stage = byId("modelStage");

    main.className = "model-main";
    if (ui.renderedView !== state.previewView) {
      ui.renderedView = state.previewView;
      main.classList.add("is-entering");
    }
    if (state.backgroundTexture === "dark-royal") {
      main.classList.add("is-dark");
      main.classList.add("theme-dark");
    }

    const title = lessonDisplayTitle();
    const subtitle = state.lessonSubtitle.trim() || "Skills for Life — sample preview";
    const bullets = parseBullets(state.sampleBullets);
    const mythLines = String(state.sampleMyth || "")
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);

    sidebar.innerHTML = renderModelSidebar(title);
    updateDistinctMeter();

    if (state.previewView === "title") {
      stage.innerHTML = renderTitleSlide(title, subtitle);
    } else if (state.previewView === "divider") {
      stage.innerHTML = renderDividerSlide(title);
    } else {
      stage.innerHTML = renderContentSlide(bullets, mythLines, subtitle);
    }

    document.querySelectorAll('#previewTabs [role="tab"]').forEach((tab) => {
      const selected = tab.dataset.view === state.previewView;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
    });

    announcePreview(title);
  }

  function updateDistinctMeter() {
    const meter = byId("distinctMeter");
    if (!meter) return;
    const near = Brief.distinctness(state.meta, state);
    const text = near.shared === near.total
      ? `Same look as ${near.lesson}`
      : `Closest lesson: ${near.lesson} · ${near.shared} of ${near.total} shared`;
    meter.innerHTML = `${distinctPips(near)}<span>${escapeHtml(text)}</span>`;
    meter.classList.toggle("is-copy", near.shared === near.total);
    meter.title = "How many of the seven main choices match the closest existing SPOKES lesson.";
  }

  /** Pin a view chosen by an option/tab click until the next step change. */
  function showView(view) {
    state.previewView = view;
    ui.previewPinned = true;
  }

  /** FID-10 — honesty line under the frame for each preview view. */
  const HONESTY = {
    title: { label: "Design sample", detail: "Selected title style; the finished lesson still needs a team review." },
    divider: { label: "Design sample", detail: "Selected divider style; chapter images and final layout are reviewed after the build." },
    cards: {
      label: "Representative",
      detail: "The builder picks the component per content type; this card style applies to all cards in this chapter."
    }
  };

  /** Caption under the frame + live region text; gold ring pulse on option changes. */
  function announcePreview(title) {
    const caption = byId("stageCaption");
    const live = byId("liveRegion");
    const viewName = VIEW_NAMES[state.previewView] || "Preview";
    const honesty = HONESTY[state.previewView] || HONESTY.title;
    byId("spokesModel").classList.toggle("is-trying", Boolean(ui.tryingOn));
    if (ui.tryingOn) {
      caption.innerHTML = `<strong>Previewing ${escapeHtml(ui.tryingOn)}</strong> · click it to choose it<br><span class="honesty-caption">Not chosen yet. Move away to return to the current design.</span>`;
      return;
    }
    const change = ui.lastChange;
    ui.lastChange = null;
    const honestyHtml = `<span class="honesty-caption"><strong>${escapeHtml(honesty.label)}</strong> — ${escapeHtml(honesty.detail)}</span>`;
    if (change) {
      const text = change.plain
        ? `${change.dimension} · ${change.label}`
        : `Updated · ${change.dimension} → ${change.label}`;
      const changeHtml = change.plain
        ? `<strong>${escapeHtml(change.dimension)}</strong> · ${escapeHtml(change.label)}`
        : `Updated · ${escapeHtml(change.dimension)} → <strong>${escapeHtml(change.label)}</strong>`;
      caption.innerHTML = `${changeHtml}<br>${honestyHtml}`;
      live.textContent = `${text}. ${honesty.label}. Spokes Model showing ${viewName.toLowerCase()} for ${title}.`;
      pulseFrame();
    } else {
      caption.innerHTML = `<strong>${escapeHtml(viewName)}</strong> · ${escapeHtml(title)}<br>${honestyHtml}`;
      live.textContent = `Spokes Model showing ${viewName.toLowerCase()} for ${title}. ${honesty.label}: ${honesty.detail}`;
    }
  }

  function pulseFrame() {
    if (prefersReduced) return;
    const frame = byId("spokesModel");
    frame.classList.remove("is-updated");
    void frame.offsetWidth;
    frame.classList.add("is-updated");
    clearTimeout(ui.pulseTimer);
    ui.pulseTimer = setTimeout(() => frame.classList.remove("is-updated"), 260);
  }

  /** Same pieces, in the same order, as template.html's title slide, so library title CSS lands as it will in the lesson. */
  function renderTitleSlide(title, subtitle) {
    return `
      <div class="slide-title" data-preview="title">
        <img class="logo" src="../SPOKES-Logo.png" alt="" width="280" height="186">
        <h1>${escapeHtml(title)}</h1>
        <div class="divider" aria-hidden="true"></div>
        <p class="subtitle">${escapeHtml(subtitle)}</p>
        <p class="copyright" aria-hidden="true">Copyright © 2026 WV Adult Basic Education</p>
      </div>`;
  }

  function renderDividerSlide(title) {
    return `
      <div class="slide-section" data-chapter="${PREVIEW_CHAPTER}" data-chapter-num="${PREVIEW_CHAPTER_NUM}">
        <span class="section-circle" aria-hidden="true"></span>
        <span class="chapter-label">Presentation 1</span>
        <h2>${escapeHtml(title)}</h2>
        <div class="divider" aria-hidden="true"></div>
      </div>`;
  }

  function renderContentSlide(bullets, mythLines, subtitle) {
    const chapter = contentChapter();
    const cards = (bullets.length ? bullets : ["Sample point one", "Sample point two", "Sample point three"])
      .slice(0, 3)
      .map((b, i) => {
        const myth = mythLines[i] || "";
        return `<div class="card"><h4>${escapeHtml(b)}</h4><p>${escapeHtml(myth || "Sample card from your content.")}</p></div>`;
      })
      .join("");
    const chip = state.varyCardsByChapter
      ? `<span class="slide-chip">Chapter ${chapter.key} · ${escapeHtml(findOption("cards", chapter.slug)?.label || chapter.slug)}</span>`
      : "";
    const reality = mythLines.find((l) => /^reality/i.test(l)) || subtitle;
    return `
      <div class="model-content" data-chapter="${chapter.num}">
        <div class="slide-head"><h3>Key points</h3>${chip}</div>
        <div class="divider" aria-hidden="true"></div>
        <div class="cards-grid">${cards}</div>
        <div class="content-foot">
          <p class="takeaway"><strong>Takeaway:</strong> ${escapeHtml(String(reality).replace(/^reality:\s*/i, ""))}</p>
          <span class="download-btn" aria-hidden="true">Download handout</span>
        </div>
      </div>`;
  }

  function fileNotice(message) {
    const notice = byId("fileStatus");
    notice.hidden = false;
    notice.textContent = message;
  }

  function validateSelectionPayload(payload) {
    const object = (value) => value && typeof value === "object" && !Array.isArray(value);
    if (!object(payload) || payload.schema !== "bespoke-selection/v1") throw new Error("Choose a Bespoke design file.");
    if (!object(payload.lesson) || !findMeta(state.meta.lessons, payload.lesson.id)) throw new Error("This file does not name one of the six new lessons.");
    if (!object(payload.theme) || !object(payload.theme.cards) || !object(payload.team) || !object(payload.team.spokesperson)) throw new Error("The design or team details are incomplete.");
    const theme = payload.theme;
    for (const [field, family] of Object.entries({colorLead: "colorLeads", sidebarColor: "sidebarColors", backgroundTexture: "backgroundTextures", titleSlide: "titleSlides", dividerStyle: "dividers"})) {
      const option = findOption(family, theme[field]);
      if (!option || option.blocked) throw new Error(`The ${field} choice is not available. Ask Britt to check this file.`);
    }
    if (!findMeta(state.meta.fontPairings, theme.fontPairing) || !findMeta(state.meta.presets, payload.presetId)) throw new Error("The font or starter theme is not available.");
    const legalCard = (slug) => { const option = findOption("cards", slug); return option && !option.blocked; };
    if (!legalCard(theme.cards.lessonWide) || typeof theme.cards.varyByChapter !== "boolean") throw new Error("The card style is not available.");
    if (theme.cards.varyByChapter) {
      if (!object(theme.cards.chapterStyles)) throw new Error("Chapter card choices are missing.");
      let previous;
      for (const chapter of state.meta.chapterKeys) {
        const slug = theme.cards.chapterStyles[chapter];
        if (!legalCard(slug) || slug === previous) throw new Error("Each chapter needs an available card style different from the chapter before it.");
        previous = slug;
      }
    }
    for (const value of [payload.lesson.title, payload.lesson.displayTitle, payload.lesson.subtitle, payload.team.name, payload.team.spokesperson.name, payload.team.spokesperson.email, payload.unspoken, payload.sampleContent?.bullets, payload.sampleContent?.mythReality]) {
      if (value !== undefined && typeof value !== "string") throw new Error("This file has invalid text fields. Your current draft has not changed.");
    }
    if (payload.sampleContent !== undefined && !object(payload.sampleContent)) throw new Error("The sample text is invalid.");
    if (payload.brief !== undefined) {
      const brief = payload.brief;
      const answers = state.meta.briefAnswers || {};
      const valid = object(brief) &&
        ["feel", "room", "fresh", "light"].every((key) => (answers[key] || []).includes(brief[key])) &&
        typeof brief.variant === "string" && /^[0-9]{1,4}$/.test(brief.variant);
      if (!valid) throw new Error("The design brief in this file is not valid. Your current draft has not changed.");
    }
    if (JSON.stringify(payload).length > MAX_FILE_BYTES) throw new Error("This file is too large. Keep source documents and media in the shared folder.");
  }

  function prepareDraftReplacement() {
    let raw;
    try { raw = localStorage.getItem(STORAGE_KEY); }
    catch {
      if (!confirm("Browser saving is unavailable. Open this copy? Choose Save first if you need the current design.")) return false;
      storageConflict = false;
      return true;
    }
    if (raw) {
      if (!confirm("Open this copy instead of the current browser draft? Choose Save first if you need to keep your current work. One previous browser draft will be kept for recovery.")) return false;
      try { localStorage.setItem(BACKUP_KEY, raw); }
      catch { fileNotice("Could not keep a recovery copy. Choose Save before clearing the browser draft and trying again."); return false; }
    }
    lastSavedRaw = raw;
    storageConflict = false;
    return true;
  }

  function saveTeamFile() {
    try {
      const payload = buildSelectionPayload();
      validateSelectionPayload(payload);
      const stamp = payload.submittedAt.replace(/[:.]/g, "-");
      const filename = `${payload.lesson.id}-${stamp}-selection.json`;
      downloadText(filename, JSON.stringify(payload, null, 2), "application/json");
      const status = byId("builderFileStatus");
      if (status) status.textContent = "Downloaded a backup file without the private access code.";
      fileNotice("Backup downloaded. Keep it in the team’s shared folder; it does not contain the private access code.");
      return true;
    } catch (err) { fileNotice(`Could not download the design file. ${err.message}`); return false; }
  }

  async function openTeamFile(file) {
    if (!file) return;
    try {
      if (file.size > MAX_FILE_BYTES) throw new Error("This file is too large. Select the small Bespoke design file, not a source document.");
      const payload = JSON.parse(await file.text());
      validateSelectionPayload(payload);
      if (ui.teamSession && payload.lesson.id !== ui.teamSession.lessonId) {
        throw new Error("This backup belongs to a different lesson than the open team session.");
      }
      if (!prepareDraftReplacement()) return;
      applySelectionPayload(payload);
      ui.autosavePaused = Boolean(ui.teamSession);
      if (!ui.teamSession) {
        ui.mode = "edit";
        state.editCode = "";
      }
      state.step = stepIndex("review");
      ui.restoredFromLink = false;
      ui.editCodeHash = "";
      ui.restoreNote = "";
      history.replaceState(null, "", location.pathname + location.search);
      render();
      fileNotice(`Opened ${file.name}. Check the lesson and choices. This is your browser draft; choose Save shared design when team access is open.`);
    } catch (err) { fileNotice(`Could not open that team file. ${err.message} Your current draft has not changed.`); }
  }

  function draftFieldsFromSelection(payload) {
    const theme = payload.theme || {};
    const cards = theme.cards || {};
    const team = payload.team || {};
    const sp = team.spokesperson || {};
    const lesson = payload.lesson || {};
    return {
      lessonId: lesson.id || state.lessonId,
      lessonTitle: lesson.displayTitle || lesson.title || "",
      lessonSubtitle: lesson.subtitle || "",
      teamName: team.name || "",
      spokespersonName: sp.name || "",
      spokespersonEmail: sp.email || "",
      presetId: payload.presetId || state.presetId,
      colorLead: theme.colorLead || state.colorLead,
      sidebarColor: theme.sidebarColor || state.sidebarColor,
      backgroundTexture: theme.backgroundTexture || state.backgroundTexture,
      titleSlide: theme.titleSlide || state.titleSlide,
      dividerStyle: theme.dividerStyle || state.dividerStyle,
      fontPairing: theme.fontPairing || state.fontPairing,
      cardStyle: cards.lessonWide || state.cardStyle,
      varyCardsByChapter: Boolean(cards.varyByChapter),
      chapterCards: cards.varyByChapter && cards.chapterStyles ? { ...cards.chapterStyles } : {},
      sampleBullets: payload.sampleContent?.bullets ?? "",
      sampleMyth: payload.sampleContent?.mythReality ?? "",
      unspoken: payload.unspoken || "",
      ...briefFieldsFromSelection(payload)
    };
  }

  function applySelectionPayload(payload) {
    validateSelectionPayload(payload);
    Object.assign(state, draftFieldsFromSelection(payload));
  }

  function bytesToBase64Url(bytes) {
    let bin = "";
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function base64UrlToBytes(str) {
    const pad = "=".repeat((4 - (str.length % 4)) % 4);
    const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  async function encodeCompressedHash(json) {
    if (typeof CompressionStream === "undefined") return null;
    const bytes = new TextEncoder().encode(json);
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    const buf = new Uint8Array(await new Response(stream).arrayBuffer());
    return bytesToBase64Url(buf);
  }

  async function decodeCompressedHash(b64url) {
    if (typeof DecompressionStream === "undefined") {
      throw new Error("This browser cannot open a compressed link");
    }
    const bytes = base64UrlToBytes(b64url);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const text = await new Response(stream).text();
    return JSON.parse(text);
  }

  function decodeLegacyBase64(b64) {
    return JSON.parse(decodeURIComponent(escape(atob(b64))));
  }

  function hashBody() {
    const raw = location.hash.startsWith("#") ? location.hash.slice(1) : location.hash;
    if (!raw) return "";
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  async function decodeViewPayload(value) {
    try {
      return await decodeCompressedHash(value);
    } catch {
      return decodeLegacyBase64(value);
    }
  }

  async function hashEditCode(code) {
    const bytes = new TextEncoder().encode(String(code).trim());
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return bytesToBase64Url(new Uint8Array(digest));
  }

  function hashesMatch(a, b) {
    if (!a || !b || a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  /**
   * View hashes carry the design plus editCodeHash. They open read-only
   * until someone enters the matching edit code. Old `#e=` links do not grant edit.
   */
  async function readShareLink() {
    const body = hashBody();
    if (!body) return { kind: "none" };
    const eq = body.indexOf("=");
    if (eq < 1) return { kind: "none" };
    const kind = body.slice(0, eq);
    const value = body.slice(eq + 1);
    if (!value) return { kind: "none" };
    if (kind === "v" || kind === "s" || kind === "c") {
      const payload = kind === "s" ? decodeLegacyBase64(value) : await decodeViewPayload(value);
      return { kind: "view", payload };
    }
    if (kind === "e") return { kind: "retired" };
    return { kind: "none" };
  }

  async function buildViewUrl() {
    const payload = buildSelectionPayload();
    const json = JSON.stringify(payload);
    const compressed = await encodeCompressedHash(json);
    if (!compressed) {
      return {
        url: "",
        message: "This browser cannot make a view link. Choose Save and open the design at the next meeting."
      };
    }
    const url = new URL(location.href);
    url.hash = `v=${compressed}`;
    const href = url.toString();
    if (href.length > SHARE_URL_MAX) {
      return {
        url: "",
        message: "This design is too long for a view link. Choose Save and keep the sample text shorter."
      };
    }
    return { url: href, message: "Snapshot link copied. Copy a new link after changes. Choose Save for the next meeting." };
  }

  function rememberUnlock(code) {
    try {
      sessionStorage.setItem(UNLOCK_HASH_KEY, ui.editCodeHash);
      sessionStorage.setItem(UNLOCK_CODE_KEY, code);
    } catch {
      /* private mode */
    }
  }

  async function rememberedLeadCode() {
    try {
      const hash = sessionStorage.getItem(UNLOCK_HASH_KEY) || "";
      const code = sessionStorage.getItem(UNLOCK_CODE_KEY) || "";
      if (!hash || !code || !hashesMatch(hash, ui.editCodeHash)) return "";
      const check = await hashEditCode(code);
      return hashesMatch(check, ui.editCodeHash) ? code : "";
    } catch {
      return "";
    }
  }

  async function tryUnlockLead() {
    const input = byId("leadCodeInput");
    const err = byId("leadCodeError");
    const code = (input?.value || "").trim();
    if (code.length < EDIT_CODE_MIN) {
      if (err) err.textContent = `Enter your edit code. It needs at least ${EDIT_CODE_MIN} characters.`;
      input?.focus();
      return;
    }
    if (!ui.editCodeHash) {
      if (err) err.textContent = "This shared design has no edit code. Ask the team lead to copy a new view link.";
      return;
    }
    const hashed = await hashEditCode(code);
    if (!hashesMatch(hashed, ui.editCodeHash)) {
      if (err) err.textContent = "That code is not right. Try again.";
      input?.focus();
      return;
    }
    if (!prepareDraftReplacement()) return;
    state.editCode = code;
    ui.mode = "edit";
    history.replaceState(null, "", location.pathname + location.search);
    ui.restoreNote = "Editing this snapshot. Choose Save after changes; old view links do not update.";
    rememberUnlock(code);
    if (err) err.textContent = "";
    saveDraft();
    render();
    clearTimeout(saveAnnounceTimer);
    const live = byId("saveLive");
    if (live) live.textContent = "You can edit this design now.";
  }

  async function openShareLink() {
    if (startupTeamLink) {
      loadDraft();
      const teamValue = startupTeamLink;
      startupTeamLink = "";
      const team = parseTeamLink(teamValue);
      if (!team) {
        ui.mode = "edit";
        ui.restoreNote = "This private team link is incomplete or out of date. Your browser draft was left unchanged.";
        return { team: false };
      }
      const previousLesson = state.lessonId;
      restoreTeamSession();
      installTeamSession(team.lessonId, team.editCode);
      ui.mode = "edit";
      if (lastSavedRaw && previousLesson !== team.lessonId) {
        keepRecoveryCopy();
        resetDesignForLesson(team.lessonId);
        lastSavedRaw = null;
      } else {
        state.lessonId = team.lessonId;
      }
      return { team: true };
    }
    let link;
    try {
      link = await readShareLink();
    } catch (err) {
      console.warn("Bespoke share link could not be opened", err);
      ui.mode = "view";
      ui.restoreNote = "This link could not be opened. The design saved on this computer was left as it was.";
      return { team: false, snapshot: true };
    }
    if (link.kind === "view") {
      ui.mode = "view";
      ui.editCodeHash = typeof link.payload?.editCodeHash === "string" ? link.payload.editCodeHash : "";
      try {
        applySelectionPayload(link.payload);
      } catch (err) {
        console.warn("Bespoke share link could not be opened", err);
        ui.restoreNote = "This link could not be opened. The design saved on this computer was left as it was.";
        return { team: false, snapshot: true };
      }
      state.editCode = "";
      state.step = stepIndex("review");
      ui.restoredFromLink = true;
      return { team: false, snapshot: true };
    }
    if (link.kind === "retired") {
      ui.mode = "view";
      ui.restoreNote = "This link is out of date. Ask the team lead for the view link.";
      return { team: false, snapshot: true };
    }
    loadDraft();
    ui.mode = "edit";
    const session = restoreTeamSession();
    if (session) state.lessonId = session.lessonId;
    return { team: Boolean(session) };
  }

  function buildSelectionPayload() {
    const lesson = findMeta(state.meta.lessons, state.lessonId);
    const today = new Date().toISOString().slice(0, 10);
    return {
      schema: "bespoke-selection/v1",
      submittedAt: new Date().toISOString(),
      date: today,
      libraryCatalogVersion: state.library?.version || null,
      lesson: {
        id: state.lessonId,
        title: lesson ? lesson.title : state.lessonId,
        displayTitle: lessonDisplayTitle(),
        subtitle: state.lessonSubtitle.trim()
      },
      team: {
        name: state.teamName.trim(),
        spokesperson: {
          name: state.spokespersonName.trim(),
          email: state.spokespersonEmail.trim()
        }
      },
      presetId: state.presetId,
      theme: {
        // Slugs only — matches theme-registry.json field values
        colorLead: state.colorLead,
        sidebarColor: state.sidebarColor,
        backgroundTexture: state.backgroundTexture,
        titleSlide: state.titleSlide,
        dividerStyle: state.dividerStyle,
        fontPairing: state.fontPairing,
        cards: {
          lessonWide: state.cardStyle,
          varyByChapter: state.varyCardsByChapter,
          chapterStyles: state.varyCardsByChapter ? { ...state.chapterCards } : null
        },
        catalogIds: {
          colorLead: uiKey("colorLeads", state.colorLead),
          sidebarColor: uiKey("sidebarColors", state.sidebarColor),
          backgroundTexture: uiKey("backgroundTextures", state.backgroundTexture),
          titleSlide: uiKey("titleSlides", state.titleSlide),
          dividerStyle: uiKey("dividers", state.dividerStyle),
          cards: state.varyCardsByChapter
            ? Object.fromEntries(
                Object.entries(state.chapterCards).map(([k, slug]) => [k, uiKey("cards", slug)])
              )
            : uiKey("cards", state.cardStyle)
        }
      },
      sampleContent: {
        bullets: state.sampleBullets,
        mythReality: state.sampleMyth
      },
      unspoken: state.unspoken.trim(),
      ...briefPayload()
    };
  }

  /** The brief travels with the shared design once the feel question is answered. */
  function briefPayload() {
    if (!Brief.isComplete(briefAnswers())) return {};
    return {
      brief: {
        feel: state.briefFeel,
        room: state.briefRoom,
        fresh: state.briefFresh,
        light: state.briefLight,
        variant: String(Math.max(0, Math.min(9999, Math.trunc(state.briefVariant) || 0)))
      }
    };
  }

  /** Brief fields for the draft; a design saved without a brief gets the defaults. */
  function briefFieldsFromSelection(payload) {
    const brief = payload.brief;
    if (!brief || typeof brief !== "object") return { ...Brief.DEFAULT_BRIEF };
    return {
      briefFeel: brief.feel,
      briefRoom: brief.room,
      briefFresh: brief.fresh,
      briefLight: brief.light,
      briefVariant: Number(brief.variant) || 0
    };
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function buildIssueBody(payload) {
    const json = JSON.stringify(payload, null, 2);
    return [
      `## Spoke Signal — ${payload.lesson.title}`,
      "",
      `| Field | Value |`,
      `| --- | --- |`,
      `| Lesson | \`${payload.lesson.id}\` |`,
      `| Team | ${payload.team.name || "—"} |`,
      `| Spokesperson | ${payload.team.spokesperson.name} |`,
      `| Preset | ${payload.presetId} |`,
      `| Date | ${payload.date} |`,
      "",
      "An Action will open a lesson-tagged PR with `selection.json`. The Action writer (`bespoke-write-submission.py`) is the single source of `content-intake.md`.",
      "",
      "<!-- bespoke-payload:begin -->",
      "```json",
      json,
      "```",
      "<!-- bespoke-payload:end -->"
    ].join("\n");
  }

  function handoffBase(value) {
    if (typeof value !== "string") return "";
    const trimmed = value.trim().replace(/\/$/, "");
    if (!trimmed) return "";
    try {
      const url = new URL(trimmed);
      const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
      if (url.protocol === "https:" || (url.protocol === "http:" && local)) return trimmed;
    } catch {
      /* ignore */
    }
    return "";
  }

  async function loadHandoffConfig() {
    try {
      const res = await fetch(HANDOFF_CONFIG_URL, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      handoffApiBase = handoffBase(data && data.apiBase);
    } catch {
      handoffApiBase = "";
    }
  }

  async function handoffRequest(action, fields = {}) {
    if (!handoffApiBase) {
      return { ok: false, error: "setup", message: "Shared saving is not connected. Your browser draft and backup file still work." };
    }
    const body = { action };
    for (const key of ["lessonId", "editCode", "selection", "expectedRevision", "mutationId", "revision", "submissionId", "runId"]) {
      if (Object.hasOwn(fields, key)) body[key] = fields[key];
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), HANDOFF_TIMEOUT_MS);
    try {
      const res = await fetch(handoffApiBase, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      const data = await res.json().catch(() => null);
      if (!data || typeof data !== "object") {
        return { ok: false, error: "store", message: "The shared store returned an unreadable response. Your browser draft is safe.", httpStatus: res.status };
      }
      return { ...data, httpStatus: res.status };
    } catch (error) {
      if (controller.signal.aborted || error?.name === "AbortError") {
        return { ok: false, error: "timeout", message: "The shared store took too long to respond. Your browser draft is safe. Try again." };
      }
      return { ok: false, error: "network", message: "Could not reach the shared store. Your browser draft is safe. Try again when you are online." };
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function requireTeamSession() {
    if (ui.teamSession) return ui.teamSession;
    fileNotice("Open your private team access before using shared Save or Send. Download backup still works.");
    openOpenDialog();
    return null;
  }

  function currentSelection() {
    const payload = buildSelectionPayload();
    validateSelectionPayload(payload);
    return payload;
  }

  function resetDesignForLesson(lessonId) {
    Object.assign(state, {
      step: stepIndex("welcome"),
      lessonId,
      teamName: "",
      spokespersonName: "",
      spokespersonEmail: "",
      presetId: "professional",
      colorLead: "blue",
      sidebarColor: "dark",
      backgroundTexture: "dot-grid",
      titleSlide: "centered-gradient",
      dividerStyle: "gradient-sweep",
      cardStyle: "left-border",
      varyCardsByChapter: false,
      chapterCards: {},
      fontPairing: "dm-serif-display-outfit",
      lessonTitle: "",
      lessonSubtitle: "",
      sampleBullets: "",
      sampleMyth: "",
      unspoken: "",
      ...Brief.DEFAULT_BRIEF
    });
  }

  function keepRecoveryCopy() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) localStorage.setItem(BACKUP_KEY, raw);
      return true;
    } catch {
      fileNotice("Could not keep a browser recovery copy. Download backup before loading another design.");
      return false;
    }
  }

  async function fetchSharedDesign({ replace = false, announce = true } = {}) {
    const session = requireTeamSession();
    if (!session || handoffBusy) return false;
    handoffBusy = true;
    ui.cloudBusy = true;
    if (announce) fileNotice("Checking the latest shared design…");
    try {
      const result = await handoffRequest("open", { lessonId: session.lessonId, editCode: session.editCode });
      if (!result.ok) {
        fileNotice(result.message || "Could not open the shared design. Your browser draft is unchanged.");
        return false;
      }
      if (result.selection) {
        try { validateSelectionPayload(result.selection); }
        catch (error) {
          fileNotice("The shared design could not be opened. " + error.message + " Your browser draft is unchanged.");
          return false;
        }
      }
      const dirty = hasUnsavedTeamWork();
      const remoteChanged = result.revision !== session.revision;
      if (dirty && !replace) {
        if (remoteChanged) {
          ui.cloudConflict = { revision: result.revision, savedAt: result.savedAt };
          fileNotice("A newer shared version exists. This browser draft was kept. Download a backup, then load the latest shared design before recovering any local choices.");
        } else {
          fileNotice("This browser has unsaved changes, so the shared design was not loaded. Save them or download a backup first.");
        }
        updateCloudChrome();
        return false;
      }
      if (replace && !keepRecoveryCopy()) return false;
      if (result.selection) applySelectionPayload(result.selection);
      else resetDesignForLesson(session.lessonId);
      state.lessonId = session.lessonId;
      session.revision = result.revision ?? null;
      session.savedAt = result.savedAt ?? null;
      session.pendingSave = null;
      session.baseSelectionKey = currentSelectionKey();
      ui.cloudConflict = null;
      ui.autosavePaused = false;
      persistTeamSession();
      storageConflict = false;
      try {
        lastSavedRaw = localStorage.getItem(STORAGE_KEY);
      } catch {
        lastSavedRaw = null;
        storageConflict = true;
        setSaveStatus("Browser storage unavailable");
      }
      render();
      fileNotice(result.selection
        ? "Opened the latest shared design."
        : "This team has no shared design yet. Start with the library choices, then Save shared design.");
      return true;
    } finally {
      handoffBusy = false;
      ui.cloudBusy = false;
      updateCloudChrome();
    }
  }

  /** Manual Save reports every outcome. Autosave stays quiet except for a newer shared version. */
  async function cloudSave({ auto = false } = {}) {
    if (!isLeadSession() || handoffBusy) return;
    const session = auto ? ui.teamSession : requireTeamSession();
    if (!session) return;
    if (ui.cloudConflict) {
      if (auto) return;
      fileNotice("A newer shared version exists. Download a backup and load the latest shared design before saving.");
      updateCloudChrome();
      return;
    }
    let payload;
    try { payload = currentSelection(); }
    catch (err) {
      if (!auto) fileNotice("Could not save. " + err.message);
      return;
    }
    if (payload.lesson.id !== session.lessonId) {
      if (!auto) fileNotice("This team access is locked to a different lesson. Your draft was not saved.");
      return;
    }
    const requestKey = selectionKey(payload);
    let pending = session.pendingSave;
    if (!pending || pending.selectionKey !== requestKey || pending.expectedRevision !== session.revision) {
      pending = {
        mutationId: newMutationId(),
        expectedRevision: session.revision ?? null,
        selectionKey: requestKey
      };
      session.pendingSave = pending;
      persistTeamSession();
    }
    clearTimeout(autosaveTimer);
    autosaveTimer = null;
    handoffBusy = true;
    if (auto) setSaveStatus("Saving to the shared design…");
    else fileNotice("Saving the shared design…");
    try {
      const result = await handoffRequest("save", {
        lessonId: session.lessonId,
        editCode: session.editCode,
        selection: payload,
        expectedRevision: pending.expectedRevision,
        mutationId: pending.mutationId
      });
      if (!result.ok) {
        if (result.httpStatus === 409 || result.error === "conflict") {
          ui.cloudConflict = { revision: result.revision, savedAt: result.savedAt };
          session.pendingSave = null;
          persistTeamSession();
          fileNotice("Someone saved a newer shared version. Your browser draft is safe. Download a backup, then load the latest shared design.");
          updateCloudChrome();
          return;
        }
        if (auto) setSaveStatus("Automatic save will retry");
        else fileNotice(result.message || "Shared Save did not finish. Your browser draft is safe; try Save again.");
        return;
      }
      session.revision = result.revision;
      session.savedAt = result.savedAt;
      session.baseSelectionKey = requestKey;
      session.pendingSave = null;
      ui.cloudConflict = null;
      ui.autosavePaused = false;
      persistTeamSession();
      const changedDuringSave = currentSelectionKey() !== requestKey;
      setSaveStatus(changedDuringSave
        ? "Newer browser changes not shared yet"
        : (auto ? "Saved to the shared design automatically" : "Shared design up to date"));
      if (!auto) {
        fileNotice(changedDuringSave
          ? "The version that started saving is shared. You made newer changes while it saved; choose Save shared design again."
          : (result.unchanged ? "The shared design was already up to date." : "Shared design saved."));
      }
    } finally {
      handoffBusy = false;
      updateCloudChrome();
      scheduleAutosave(AUTOSAVE.idleMs);
    }
  }

  function pendingSubmission() {
    try { return JSON.parse(localStorage.getItem(PENDING_SUBMISSION_STORAGE) || "null"); }
    catch { return null; }
  }

  function storePendingSubmission(value) {
    try {
      if (value) localStorage.setItem(PENDING_SUBMISSION_STORAGE, JSON.stringify(value));
      else localStorage.removeItem(PENDING_SUBMISSION_STORAGE);
    } catch { /* status stays visible for this page */ }
    updateCloudChrome();
  }

  function scheduleSubmissionPoll(receipt, delay = 10000) {
    clearTimeout(submissionPollTimer);
    submissionPollTimer = window.setTimeout(() => pollSubmission(receipt), delay);
  }

  async function pollSubmission(receipt) {
    const result = await handoffRequest("status", {
      lessonId: receipt.lessonId,
      editCode: receipt.editCode,
      submissionId: receipt.submissionId,
      runId: receipt.runId
    });
    if (!result.ok) {
      fileNotice(result.message || "Britt’s receipt could not be checked. We will check again when this page opens.");
      return;
    }
    if (result.status === "processing") {
      storePendingSubmission({ ...receipt, runId: result.runId || receipt.runId, stage: "receipt" });
      fileNotice("Britt’s review request is processing. You can close this page; this browser will check again when you return.");
      scheduleSubmissionPoll({ ...receipt, runId: result.runId || receipt.runId }, 10000);
      return;
    }
    if (result.status === "received") {
      storePendingSubmission(null);
      fileNotice(result.url ? "Britt received the review request. " + result.url : "Britt received the review request.");
      return;
    }
    storePendingSubmission({ ...receipt, stage: "failed" });
    fileNotice(result.message || "The review request failed. Your saved design is unchanged; try Send to Britt again.");
  }

  async function cloudSend() {
    if (!isLeadSession() || handoffBusy) return;
    const session = requireTeamSession();
    if (!session) return;
    if (!state.spokespersonName.trim()) {
      fileNotice("Add the spokesperson's name on Lesson & team before sending.");
      return;
    }
    if (ui.cloudConflict || !session.revision || hasUnsavedTeamWork()) {
      fileNotice("Save the current shared design before sending it to Britt.");
      return;
    }
    const existing = pendingSubmission();
    let payload;
    if (existing?.stage === "request" && existing.expectedRevision === session.revision && existing.selection) {
      payload = existing.selection;
    } else {
      try { payload = currentSelection(); }
      catch (err) { fileNotice("Could not send. " + err.message); return; }
    }
    const mutationId = existing?.stage === "request" && existing.expectedRevision === session.revision
      ? existing.mutationId : newMutationId();
    const pending = {
      stage: "request",
      lessonId: session.lessonId,
      editCode: session.editCode,
      expectedRevision: session.revision,
      mutationId,
      selection: payload
    };
    storePendingSubmission(pending);
    handoffBusy = true;
    fileNotice("Requesting Britt’s review…");
    try {
      const result = await handoffRequest("send", pending);
      if (!result.ok) {
        fileNotice(result.message || "The review request did not finish. Your saved design is safe; choose Send to Britt to retry.");
        return;
      }
      const receipt = {
        stage: "receipt",
        lessonId: session.lessonId,
        editCode: session.editCode,
        expectedRevision: session.revision,
        submissionId: result.submissionId,
        runId: result.runId || null
      };
      storePendingSubmission(receipt);
      if (result.status === "received") {
        storePendingSubmission(null);
        fileNotice(result.url ? "Britt received the review request. " + result.url : "Britt received the review request.");
      } else {
        fileNotice("Britt’s review request is processing. This is not a receipt yet.");
        scheduleSubmissionPoll(receipt, 5000);
      }
    } finally {
      handoffBusy = false;
    }
  }

  async function resumePendingSubmission() {
    const pending = pendingSubmission();
    if (!pending || !ui.teamSession || pending.lessonId !== ui.teamSession.lessonId) return;
    if (pending.stage === "receipt" && pending.submissionId) {
      fileNotice("Checking Britt’s pending review receipt…");
      await pollSubmission(pending);
    } else if (pending.stage === "request") {
      fileNotice("A previous review request may not have returned a receipt. Choose Send to Britt to retry the exact saved revision.");
    } else if (pending.stage === "failed") {
      fileNotice("The previous review request failed. Your shared design is safe; choose Send to Britt to try again.");
    }
  }

  function fillOpenLessons() {
    const select = byId("openLesson");
    if (!select || !state.meta) return;
    select.replaceChildren();
    for (const lesson of state.meta.lessons) {
      const option = document.createElement("option");
      option.value = lesson.id;
      option.textContent = lesson.title;
      if ((ui.teamSession?.lessonId || state.lessonId) === lesson.id) option.selected = true;
      select.appendChild(option);
    }
  }

  function openOpenDialog() {
    fillOpenLessons();
    const err = byId("openError");
    if (err) err.textContent = "";
    const input = byId("openEditCode");
    if (input) input.value = "";
    const dialog = byId("openDialog");
    if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
    input?.focus();
  }

  async function cloudOpen() {
    if (handoffBusy) return;
    const lessonId = byId("openLesson")?.value || "";
    const editCode = (byId("openEditCode")?.value || "").trim();
    const err = byId("openError");
    if (editCode.length < EDIT_CODE_MIN) {
      if (err) err.textContent = "Enter the 8-character team code from your team's OneDrive folder.";
      return;
    }
    handoffBusy = true;
    ui.cloudBusy = true;
    if (err) err.textContent = "Checking private team access…";
    try {
      const result = await handoffRequest("open", { lessonId, editCode });
      if (!result.ok) {
        if (err) err.textContent = result.message || "That private team access could not be opened. Check the lesson and code, then try again.";
        byId("openEditCode")?.focus();
        return;
      }
      if (result.selection) {
        try { validateSelectionPayload(result.selection); }
        catch (error) {
          if (err) err.textContent = "The shared design could not be opened. " + error.message;
          return;
        }
      }
      if (!keepRecoveryCopy()) {
        if (err) err.textContent = "Could not keep a browser recovery copy. Download backup before opening another team.";
        return;
      }

      installTeamSession(lessonId, editCode);
      ui.mode = "edit";
      if (result.selection) applySelectionPayload(result.selection);
      else resetDesignForLesson(lessonId);
      state.lessonId = lessonId;
      ui.teamSession.revision = result.revision ?? null;
      ui.teamSession.savedAt = result.savedAt ?? null;
      ui.teamSession.pendingSave = null;
      ui.teamSession.baseSelectionKey = currentSelectionKey();
      ui.cloudConflict = null;
      persistTeamSession();
      storageConflict = false;
      try {
        lastSavedRaw = localStorage.getItem(STORAGE_KEY);
      } catch {
        lastSavedRaw = null;
        storageConflict = true;
        setSaveStatus("Browser storage unavailable");
      }
      if (err) err.textContent = "";
      byId("openDialog").close();
      render();
      fileNotice(result.selection
        ? "Opened the latest shared design."
        : "This team has no shared design yet. Start with the library choices, then Save shared design.");
    } finally {
      handoffBusy = false;
      ui.cloudBusy = false;
      updateCloudChrome();
    }
  }

  async function loadHistory() {
    const session = requireTeamSession();
    if (!session || handoffBusy) return;
    const panel = byId("historyPanel");
    const trigger = byId("btnHistory");
    if (!panel.hidden) {
      panel.hidden = true;
      trigger?.setAttribute("aria-expanded", "false");
      if (trigger) trigger.textContent = "Previous versions";
      trigger?.focus();
      return;
    }
    panel.hidden = false;
    trigger?.setAttribute("aria-expanded", "true");
    if (trigger) trigger.textContent = "Hide previous versions";
    panel.textContent = "Loading previous versions…";
    const [result, latest] = await Promise.all([
      handoffRequest("history", { lessonId: session.lessonId, editCode: session.editCode }),
      handoffRequest("open", { lessonId: session.lessonId, editCode: session.editCode })
    ]);
    if (!result.ok) {
      panel.textContent = result.message || "Previous versions could not be loaded.";
      return;
    }
    const list = document.createElement("ul");
    list.className = "history-list";
    for (const item of result.history || []) {
      const li = document.createElement("li");
      const text = document.createElement("span");
      text.textContent = item.savedAt ? new Date(item.savedAt).toLocaleString() : item.revision;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn btn-secondary";
      button.textContent = "Use these choices";
      button.addEventListener("click", async () => {
        if (!latest.ok) {
          fileNotice("The latest shared version could not be checked. Previous choices were not loaded.");
          return;
        }
        const latestRevision = latest.revision ?? null;
        const latestKey = latest.selection ? selectionKey(latest.selection) : session.baseSelectionKey;
        const opened = await handoffRequest("openRevision", {
          lessonId: session.lessonId,
          editCode: session.editCode,
          revision: item.revision
        });
        if (!opened.ok || !opened.selection) {
          fileNotice(opened.message || "That previous version could not be opened.");
          return;
        }
        if (!keepRecoveryCopy()) return;
        applySelectionPayload(opened.selection);
        state.lessonId = session.lessonId;
        session.revision = latestRevision;
        session.baseSelectionKey = latestKey;
        session.pendingSave = null;
        ui.cloudConflict = null;
        ui.autosavePaused = true;
        persistTeamSession();
        state.step = stepIndex("review");
        panel.hidden = true;
        trigger?.setAttribute("aria-expanded", "false");
        if (trigger) trigger.textContent = "Previous versions";
        render();
        fileNotice("Previous choices loaded into this browser draft. Review them, then Save shared design to create a new revision. Later history is preserved.");
        window.requestAnimationFrame(() => byId("stepPanel")?.focus({ preventScroll: true }));
      });
      li.append(text, button);
      list.appendChild(li);
    }
    panel.replaceChildren(list);
  }

  function onSubmit() {
    cloudSend();
  }

  function render() {
    const active = document.activeElement;
    const keepFocusId =
      active && active.id && byId("stepPanel")?.contains(active) ? active.id : null;
    const keepSelection =
      keepFocusId && (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)
        ? { start: active.selectionStart, end: active.selectionEnd }
        : null;

    const stepChanged = ui.renderedStep !== state.step;
    if (stepChanged) {
      ui.renderedStep = state.step;
      state.previewView = STEPS[state.step].view;
      ui.previewPinned = false;
    }

    buildStepper();
    renderPanel();
    lockViewControls();
    syncAccessChrome();
    updatePreview();
    if (isLeadSession()) {
      if (ui.skipNextLocalSave) ui.skipNextLocalSave = false;
      else saveDraft();
      if (stepChanged) scheduleAutosave(AUTOSAVE.stepMs);
    }

    if (keepFocusId) {
      const el = byId(keepFocusId);
      if (el) {
        el.focus({ preventScroll: true });
        if (keepSelection && typeof el.setSelectionRange === "function") {
          try {
            el.setSelectionRange(keepSelection.start, keepSelection.end);
          } catch {
            /* ignore non-text inputs */
          }
        }
        return;
      }
    }
    byId("stepPanel").focus({ preventScroll: true });
  }

  async function init() {
    const [metaRes, libRes, themeRes] = await Promise.all([
      fetch(META_URL),
      fetch(LIBRARY_URL),
      fetch(THEME_OPTIONS_URL)
    ]);
    if (!metaRes.ok) throw new Error(`Failed to load ${META_URL}`);
    if (!libRes.ok) throw new Error(`Failed to load library catalog (${libRes.status}). Is SPOKES Builder/bespoke-library-catalog.json present?`);
    if (!themeRes.ok) throw new Error(`Failed to load theme-options.json (${themeRes.status}).`);
    state.meta = await metaRes.json();
    state.library = await libRes.json();
    state.themeOptions = await themeRes.json();
    injectTextureSwatches();
    await loadHandoffConfig();
    const startup = await openShareLink();
    try {
      ui.skipNextLocalSave = sessionStorage.getItem("bespoke-left-session") === "1";
      sessionStorage.removeItem("bespoke-left-session");
    } catch { /* private mode */ }
    const mayReplaceFromCloud = Boolean(ui.teamSession) && (
      !lastSavedRaw || Boolean(ui.teamSession.baseSelectionKey && currentSelectionKey() === ui.teamSession.baseSelectionKey)
    );
    byId("btnSave").addEventListener("click", () => { cloudSave(); });
    byId("btnOpen").addEventListener("click", () => {
      if (ui.teamSession) fetchSharedDesign({ replace: false });
      else openOpenDialog();
    });
    byId("btnSend").addEventListener("click", () => { cloudSend(); });
    byId("btnDownloadBackup").addEventListener("click", () => { saveTeamFile(); });
    byId("btnOpenBackup").addEventListener("click", () => { byId("teamFileInput").click(); });
    byId("btnLoadLatest").addEventListener("click", () => { fetchSharedDesign({ replace: true }); });
    byId("btnKeepLocal").addEventListener("click", () => {
      fileNotice("Browser draft kept. Download a backup before loading the latest shared design; this draft cannot overwrite a newer shared version.");
      updateCloudChrome();
    });
    byId("btnHistory").addEventListener("click", () => { loadHistory(); });
    byId("btnCheckStatus").addEventListener("click", () => {
      const pending = pendingSubmission();
      if (pending?.stage === "receipt") pollSubmission(pending);
      else if (pending?.stage === "request") cloudSend();
      else fileNotice("There is no pending review request on this browser.");
    });
    byId("btnLeaveSession").addEventListener("click", () => {
      if (!confirm("Leave this team session on this browser? Save the shared design or download a backup first. Remembered access and local recovery copies will be removed.")) return;
      forgetTeamSession();
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(BACKUP_KEY);
        sessionStorage.setItem("bespoke-left-session", "1");
      } catch { /* reload still drops the in-memory credential */ }
      ui.allowUnload = true;
      location.reload();
    });
    byId("openCancel").addEventListener("click", () => byId("openDialog").close());
    byId("openForm").addEventListener("submit", (event) => {
      event.preventDefault();
      cloudOpen();
    });
    byId("teamFileInput").addEventListener("change", async (event) => {
      await openTeamFile(event.target.files?.[0]);
      event.target.value = "";
    });
    byId("btnRecoverDraft").addEventListener("click", () => {
      if (!isLeadSession()) return;
      try {
        const previous = localStorage.getItem(BACKUP_KEY);
        if (!previous || !confirm("Restore the previous browser draft? Choose Save first if you need the current design.")) return;
        const current = localStorage.getItem(STORAGE_KEY);
        localStorage.setItem(STORAGE_KEY, previous);
        if (current) localStorage.setItem(BACKUP_KEY, current);
        history.replaceState(null, "", location.pathname + location.search);
        ui.allowUnload = true;
        location.reload();
      } catch { fileNotice("Could not recover the browser draft. Open the private team access or an exported backup."); }
    });
    window.addEventListener("beforeunload", (event) => {
      if (ui.allowUnload || !isLeadSession() || !hasUnsavedTeamWork()) return;
      runAutosave();
      event.preventDefault();
      event.returnValue = "";
    });
    window.addEventListener("storage", (event) => {
      if ((event.key === STORAGE_KEY || event.key === null) && isLeadSession()) {
        storageConflict = true;
        setSaveStatus("Not saved — another tab changed this draft");
        fileNotice("Another tab changed the saved draft. Choose Save to keep this tab’s work, then reload to open the latest browser copy. Automatic saving is paused.");
      }
    });
    if (!state.chapterCards || typeof state.chapterCards !== "object") state.chapterCards = {};

    byId("btnLeadUnlock")?.addEventListener("click", () => {
      const form = byId("leadCodeForm");
      const leadBtn = byId("btnLeadUnlock");
      if (form) form.hidden = false;
      if (leadBtn) leadBtn.setAttribute("aria-expanded", "true");
      const err = byId("leadCodeError");
      if (err) err.textContent = "";
      const input = byId("leadCodeInput");
      if (input) {
        input.value = "";
        input.focus();
      }
    });
    byId("leadCodeForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      tryUnlockLead();
    });

    byId("btnClear").addEventListener("click", () => {
      if (!isLeadSession()) return;
      if (confirm("Clear the design saved on this computer? A design you stored with Save stays until you Save a replacement.")) {
        try { localStorage.removeItem(STORAGE_KEY); }
        catch { fileNotice("Browser storage is unavailable. Choose Save before closing this page."); return; }
        try {
          sessionStorage.removeItem(UNLOCK_HASH_KEY);
          sessionStorage.removeItem(UNLOCK_CODE_KEY);
        } catch {
          /* private mode */
        }
        location.hash = "";
        ui.allowUnload = true;
        location.reload();
      }
    });

    document.querySelectorAll('#previewTabs [role="tab"]').forEach((tab) => {
      tab.addEventListener("click", () => {
        showView(tab.dataset.view);
        updatePreview();
      });
    });
    bindTablistKeys(byId("previewTabs"));

    const workspace = byId("workspace");
    document.querySelectorAll('#surfaceSwitcher [role="tab"]').forEach((tab) => {
      tab.addEventListener("click", () => {
        const surface = tab.dataset.surface;
        workspace.dataset.activeSurface = surface;
        document.querySelectorAll('#surfaceSwitcher [role="tab"]').forEach((t) => {
          t.setAttribute("aria-selected", t === tab ? "true" : "false");
        });
        const live = byId("liveRegion");
        if (live) live.textContent = surface === "preview" ? "Showing Spokes Model preview" : "Showing design options";
      });
    });
    bindTablistKeys(byId("surfaceSwitcher"));

    window.addEventListener("hashchange", () => {
      openShareLink()
        .then(() => {
          ui.renderedStep = null;
          render();
        })
        .catch((err) => console.error(err));
    });

    render();
    saveAnnounceReady = true;
    if (startup?.team || (!startup?.snapshot && ui.teamSession)) {
      await fetchSharedDesign({ replace: mayReplaceFromCloud, announce: true });
      await resumePendingSubmission();
    }
    autosaveReady = true;
    scheduleAutosave(AUTOSAVE.idleMs);
    if (isLeadSession() && ui.restoredFromLink) {
      const live = byId("saveLive");
      if (live) live.textContent = "Browser draft saved";
    }
  }

  /** A11Y-01 keyboard support: Enter/Space activate, Left/Right/Home/End move between tabs. */
  function bindTablistKeys(tablist) {
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    tabs.forEach((tab, i) => {
      tab.addEventListener("keydown", (e) => {
        let target = null;
        if (e.key === "Enter" || e.key === " ") target = tab;
        else if (e.key === "ArrowRight") target = tabs[(i + 1) % tabs.length];
        else if (e.key === "ArrowLeft") target = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === "Home") target = tabs[0];
        else if (e.key === "End") target = tabs[tabs.length - 1];
        if (!target) return;
        e.preventDefault();
        target.focus();
        target.click();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((err) => {
      const panel = byId("stepPanel");
      panel.innerHTML = `<h1>Catalog load failed</h1><p class="panel-lead">${escapeHtml(err.message)}</p>`;
      console.error(err);
    });
  });
})();
