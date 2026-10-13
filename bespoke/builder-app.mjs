import * as Model from './builder-model.mjs';
import { createReviewTools } from './review-tools.mjs';
import { readabilitySuggestions } from './readability.mjs';
import { compareDesign } from './similarity.mjs';
import { createPreviewEditor } from './preview-editor.mjs';
import { syncStageChrome } from './canvas-shell.mjs';
import { createGuide } from './guide/guide.mjs';
import { guideMark, indexForMark, keepsGuide } from './guide/questions.mjs';
import { buildQuestions, normalizeGuide } from './guide/questions.mjs';

// Keep the established SPOKES identity. Preview selection edits the cumulative
// design model; confirmed shared saves remain separate from browser drafts.
const STORAGE_KEY = 'bespoke-draft-v2';
const BACKUP_KEY = 'bespoke-previous-draft-v2';
const TEAM_SESSION_KEY = 'bespoke-team-session-v2';
// Tab-lifetime UI preference only; never part of a design, team record or export.
const PRESET_CONFIRM_KEY = 'bespoke-skip-preset-confirmation-session';
let skipPresetConfirmation = (()=>{try{return sessionStorage.getItem(PRESET_CONFIRM_KEY)==='1';}catch{return false;}})();
let pendingPreset = null;
const PENDING_SUBMISSION_STORAGE = 'bespoke-pending-submission-v2';
const MAX_FILE_BYTES = 256000;
const SHARE_URL_MAX = 8000;
const EDIT_CODE_MIN = 20;
const EDIT_CODE_MAX = 128;
const HANDOFF_TIMEOUT_MS = 20000;
const HANDOFF_CONFIG_URL = './handoff-config.json';
const VIEW_NAMES = {title:'Title slide',divider:'Chapter divider',cards:'Text boxes',video:'Video slide',activity:'Activity'};
const STEPS = [
 {id:'team',label:'Lesson & team',view:'title'},
 {id:'start',label:'Color & layout',view:'title'},
 {id:'slides',label:'Customize',view:'title'},
 {id:'review',label:'Review & save',view:'title'}
];
const LEGACY_STEPS = ['welcome','team','colors','fonts','title','divider','cards','video','activity','review'];
const onStage = id => STEPS[state.step].id === id;
const teamIdentified = () => Boolean(state.teamName.trim() && state.spokespersonName.trim());
const state = {step:0,stepId:'start',meta:null,library:null,lessonId:'money-management',teamName:'',spokespersonName:'',spokespersonEmail:'',lessonTitle:'',lessonSubtitle:'',unspoken:'',editCode:'',previewView:'title',design:null,legacySelection:null,alternatives:null,changes:[],redo:[]};
const ui = {mode:'view',renderedStep:null,previewPinned:false,teamSession:null,cloudConflict:null,cloudBusy:false,autosavePaused:false,allowUnload:false,skipNextLocalSave:false,restoreNote:'',restoredFromLink:false,editCodeHash:'',activeRole:'sidebar',paintScope:'slide',themeScope:'slide',localPreview:false,editorRole:'title',sharedThemeOpen:false,startingLooksOpen:false,meaningfulDesign:false};
ui.guide = null;
let guide = null;
let previewEditor = null;
let reviewTools = null;
ui.moreOptions = false;
let catalog, fingerprints, selectionSchema, handoffApiBase='', handoffBusy=false, lastSavedRaw=null, storageConflict=false;
// Replacing a draft or team invalidates pending operations against its predecessor.
let draftGeneration=0;
let autosaveTimer=null, autosaveReady=false, saveAnnounceTimer=null, saveAnnounceReady=false, submissionPollTimer=null;
const AUTOSAVE=Object.freeze({enabled:true,idleMs:30000,stepMs:1500,...(window.__bespokeAutosave||{})});
let startupTeamLink=(()=>{const v=location.hash.startsWith('#team=')?location.hash.slice(6):'';if(v)history.replaceState(null,'',location.pathname+location.search);return v;})();
const clone = value => structuredClone(value);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const findOption=(family,slug)=>state.library?.families?.[family]?.options.find(o=>o.slug===slug);
  function byId(id) {
    return document.getElementById(id);
  }

  function findMeta(list, id) {
    return (list || []).find((item) => item.id === id);
  }

  function stepIndex(id) {
    const mapped = Object.hasOwn(VIEW_NAMES,id) ? 'slides' : ['welcome','colors','fonts'].includes(id) ? 'start' : id;
    const index = STEPS.findIndex((step) => step.id === mapped);
    return index < 0 ? 0 : index;
  }

  function setSaveStatus(text) {
    const el = byId("saveStatus");
    if (!el) return;
    el.textContent = text;
    el.title = text;
    el.dataset.state = /another tab|failed|could not|not saved|not shared|waiting|newer|unsaved|stale|conflict/i.test(text) ? "warn" : "ok";
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
    resetPresetConfirmation();
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
    if (!same) { draftGeneration++; resetPresetConfirmation(); }
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
    if (!ui.teamSession || !ui.teamSession.revision) return "Browser draft saved";
    if (ui.localPreview) return hasUnsavedTeamWork() ? "Browser draft saved · local test save pending" : "Local test design up to date";
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
    status.textContent = ui.localPreview
      ? `${lesson?.title || session.lessonId} · Local test session. ${session.savedAt ? 'Saved '+new Date(session.savedAt).toLocaleString()+'.' : 'No test save yet.'} ${session.revision && hasUnsavedTeamWork() ? 'Browser changes are waiting to save.' : ''}`
      : `${lesson?.title || session.lessonId} team session.${saved}${dirty}`;
    let delivered=byId('lastReviewReceipt');
    if(!delivered){delivered=document.createElement('p');delivered.id='lastReviewReceipt';delivered.className='review-receipt';panel.append(delivered);}
    delivered.replaceChildren();delivered.hidden=!session.lastReceipt;
    if(session.lastReceipt){
      delivered.append(document.createTextNode('Last confirmed review package · '+session.lastReceipt.submissionId+'. '));
      for(const [field,label] of [['url','Open review request'],['artifactUrl','Exact submitted artifact']]){
        const value=session.lastReceipt[field];
        if(typeof value!=='string'||!value.startsWith('https://github.com/doclegg05/Curriculum-Employability-Skills/'))continue;
        const link=document.createElement('a');link.href=value;link.textContent=label;link.target='_blank';link.rel='noopener';delivered.append(link,document.createTextNode(' · '));
      }
      delivered.append(document.createTextNode('Ready for review; delivery does not confirm that the package has been reviewed.'));
    }
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
      if (["btnBack","btnNext","btnNextRole","btnContinueEditing","btnQuickReview","btnBuildOwn","btnChangeStartingLook"].includes(el.id) || el.dataset.editorRole || el.dataset.scopeRole || el.id.startsWith("review-preview-") || el.id.startsWith("review-edit-")) return;
      el.disabled = true;
      el.setAttribute("aria-disabled", "true");
    });
  }

  function renderTeam(panel, {heading = true} = {}) {
    panel.innerHTML = `
      ${heading ? `<h2>Lesson &amp; team</h2>
      <p class="panel-lead">One spokesperson saves the team’s decisions. Confirm the lesson and team for this design.</p>` : ""}
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
    if (ui.teamSession && !ui.localPreview) {
      state.lessonId = ui.teamSession.lessonId;
      select.value = ui.teamSession.lessonId;
      select.disabled = true;
      select.title = "This private team session is locked to its assigned lesson.";
    }
    select.addEventListener("change", () => {
      if (ui.teamSession && !ui.localPreview) return;
      if(ui.localPreview){installTeamSession(select.value,'bespoke-local-preview-synthetic');ui.autosavePaused=true;}
      resetPresetConfirmation();
      state.lessonId = select.value;
      saveDraft();
      updatePreview();
      updateTeamPill();
    });
    const bind = (id, key) => {
      const input = byId(id);
      if (!input) return;
      input.value = state[key] || "";
      const sync = () => {
        if(key==='teamName'&&state[key]!==input.value)resetPresetConfirmation();
        state[key] = input.value;
        saveDraft();
        updatePreview();
        updateTeamPill();
      };
      input.addEventListener("input", sync);
      input.addEventListener("change", sync);
    };
    bind("teamName", "teamName");
    bind("spokespersonName", "spokespersonName");
    bind("spokespersonEmail", "spokespersonEmail");
  }

  function fileNotice(message) {
    const notice = byId("fileStatus");
    notice.hidden = false;
    notice.textContent = message;
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
      if (!keepRecoveryCopy()) return false;
    }
    lastSavedRaw = raw;
    storageConflict = false;
    return true;
  }

  function saveTeamFile() {
    try {
      const payload = buildSelectionPayload();
      validateSelectionPayload(payload, {draft:true});
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
      validateSelectionPayload(payload, {draft:true});
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
      if (!state.legacySelection) ui.restoreNote = "";
      history.replaceState(null, "", location.pathname + location.search);
      render();
      fileNotice(`Opened ${file.name}. Check the lesson and choices. This is your browser draft; ${ui.localPreview ? 'choose Save test design to save it to the local test service.' : 'choose Save shared design when team access is open.'}`);
    } catch (err) { fileNotice(`Could not open that team file. ${err.message} Your current draft has not changed.`); }
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
    ui.localPreview = ["localhost", "127.0.0.1"].includes(location.hostname);
    try {
      const res = await fetch(HANDOFF_CONFIG_URL, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      handoffApiBase = handoffBase(data && data.apiBase);
      const localHost = ['localhost', '127.0.0.1'].includes(location.hostname);
      if (localHost) {
        const target = handoffApiBase ? new URL(handoffApiBase) : null;
        if (!target || !['localhost', '127.0.0.1'].includes(target.hostname) || !data.localPreview) handoffApiBase = '';
        ui.localPreview = true;
      }
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

  function keepRecoveryCopy() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // A different tab may own localStorage while this tab has newer in-memory
      // choices. Preserve the actual design about to be replaced. If restoration
      // failed, retain the unreadable original instead of a default substitute.
      if (raw || lastSavedRaw) localStorage.setItem(BACKUP_KEY, lastSavedRaw === null && raw ? raw : serializeDraft());
      return true;
    } catch {
      fileNotice("Could not keep a browser recovery copy. Download backup before loading another design.");
      return false;
    }
  }

  async function fetchSharedDesign({ replace = false, announce = true } = {}) {
    const session = requireTeamSession();
    if (!session || handoffBusy) return false;
    const generation = draftGeneration, openingKey = currentSelectionKey();
    handoffBusy = true;
    ui.cloudBusy = true;
    if (announce) fileNotice("Checking the latest shared design…");
    try {
      const result = await handoffRequest("open", { lessonId: session.lessonId, editCode: session.editCode });
      if (session !== ui.teamSession || generation !== draftGeneration) return false;
      if (!result.ok) {
        fileNotice(result.message || "Could not open the shared design. Your browser draft is unchanged.");
        return false;
      }
      if (result.selection) {
        try { validateSelectionPayload(result.selection,{draft:true}); }
        catch (error) {
          fileNotice("The shared design could not be opened. " + error.message + " Your browser draft is unchanged.");
          return false;
        }
      }
      const dirty = hasUnsavedTeamWork();
      const remoteChanged = result.revision !== session.revision;
      if (dirty && (!replace || openingKey !== currentSelectionKey())) {
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
      if (result.selection && selectionKey(result.selection) !== currentSelectionKey()) applySelectionPayload(result.selection);
      else if (!result.selection) resetDesignForLesson(session.lessonId);
      if(result.selection)ui.meaningfulDesign=true;
      state.lessonId = session.lessonId;
      session.revision = result.revision ?? null;
      session.savedAt = result.savedAt ?? null;
      session.pendingSave = null;
      session.baseSelectionKey = result.selection?.schema === "bespoke-selection/v1" ? selectionKey(result.selection) : currentSelectionKey();
      ui.cloudConflict = null;
      ui.autosavePaused = ui.autosavePaused || Boolean(state.legacySelection);
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
      if(result.selection)fileNotice("Opened the latest shared design.");
      else byId("fileStatus").hidden=true;
      return true;
    } finally {
      handoffBusy = false;
      ui.cloudBusy = false;
      updateCloudChrome();
    }
  }

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
    const generation = draftGeneration;
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
      if (session !== ui.teamSession) return;
      const replacedDuringSave = generation !== draftGeneration;
      if (!result.ok) {
        if (replacedDuringSave) { session.pendingSave = null; persistTeamSession(); return; }
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
      if (replacedDuringSave) {
        persistTeamSession();
        setSaveStatus(draftStatusText());
        fileNotice(ui.localPreview
          ? "The previous draft finished saving locally. Your current browser draft was kept; review it and choose Save test design."
          : "The previous draft finished saving. Your current browser draft was kept; review it and choose Save to share it.");
        return;
      }
      ui.autosavePaused = false;
      if(!auto)ui.meaningfulDesign=true;
      persistTeamSession();
      saveDraft();
      const changedDuringSave = currentSelectionKey() !== requestKey;
      setSaveStatus(ui.localPreview
        ? (changedDuringSave ? "Newer browser changes not saved to the local test service yet" : "Local test design up to date")
        : (changedDuringSave ? "Newer browser changes not shared yet" : (auto ? "Saved to the shared design automatically" : "Shared design up to date")));
      if (!auto) {
        fileNotice(ui.localPreview
          ? (changedDuringSave ? "The version that started saving is saved locally. You made newer changes while it saved; choose Save test design again." : (result.unchanged ? "The local test design was already up to date." : "Local test design saved."))
          : (changedDuringSave ? "The version that started saving is shared. You made newer changes while it saved; choose Save shared design again." : (result.unchanged ? "The shared design was already up to date." : "Shared design saved.")));
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

  function rememberReceipt(result, receipt) {
    if (ui.teamSession?.lessonId === receipt.lessonId && ui.teamSession.editCode === receipt.editCode) {
      ui.teamSession.lastReceipt = {submissionId:result.submissionId, url:result.url, artifactUrl:result.artifactUrl, revision:result.revision, receivedAt:new Date().toISOString()};
      persistTeamSession();
    }
    storePendingSubmission(null);
    fileNotice(result.url ? "Britt received the review request. " + result.url : "Britt received the review request.");
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
    if(ui.teamSession?.lessonId!==receipt.lessonId||ui.teamSession.editCode!==receipt.editCode||pendingSubmission()?.submissionId!==receipt.submissionId)return;
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
      rememberReceipt(result, receipt);
      return;
    }
    storePendingSubmission({ ...receipt, stage: "failed" });
    fileNotice(result.message || "The review request failed. Your saved design is unchanged; try Send to Britt again.");
  }

  async function cloudSend() {
    if (!isLeadSession() || handoffBusy) return;
    if (ui.localPreview) { fileNotice("This local preview does not send review requests. Your test design and backups remain available."); return; }
    const session = requireTeamSession();
    if (!session) return;
    if (!state.spokespersonName.trim()) {
      goStage('team');byId('spokespersonName')?.focus();fileNotice("Add the spokesperson's name on Lesson & team before sending.");
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
      if(ui.teamSession!==session)return;
      if (!result.ok) {
        fileNotice(result.message || "The review request did not finish. Your saved design is safe; choose Send to Britt to retry.");
        return;
      }
      const receipt = {
        stage: "receipt",
        lessonId: session.lessonId,
        editCode: session.editCode,
        expectedRevision: pending.expectedRevision,
        submissionId: result.submissionId,
        runId: result.runId || null
      };
      storePendingSubmission(receipt);
      if (result.status === "received") {
        rememberReceipt(result, receipt);
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
    const generation = draftGeneration, openingKey = currentSelectionKey();
    const lessonId = byId("openLesson")?.value || "";
    const editCode = (byId("openEditCode")?.value || "").trim();
    const err = byId("openError");
    if (editCode.length < EDIT_CODE_MIN) {
      if (err) err.textContent = "Enter the administrator-provided private access code. It needs at least " + EDIT_CODE_MIN + " characters.";
      return;
    }
    handoffBusy = true;
    ui.cloudBusy = true;
    if (err) err.textContent = "Checking private team access…";
    try {
      const result = await handoffRequest("open", { lessonId, editCode });
      if (generation !== draftGeneration || openingKey !== currentSelectionKey()) {
        if (err) err.textContent = "The browser draft changed while opening. Your current choices were kept; open again when ready.";
        return;
      }
      if (!result.ok) {
        if (err) err.textContent = result.message || "That private team access could not be opened. Check the lesson and code, then try again.";
        byId("openEditCode")?.focus();
        return;
      }
      if (result.selection) {
        try { validateSelectionPayload(result.selection,{draft:true}); }
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
      ui.teamSession.baseSelectionKey = result.selection?.schema === "bespoke-selection/v1" ? selectionKey(result.selection) : currentSelectionKey();
      ui.autosavePaused = Boolean(state.legacySelection);
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
      if(result.selection)fileNotice("Opened the latest shared design.");
      else byId("fileStatus").hidden=true;
    } finally {
      handoffBusy = false;
      ui.cloudBusy = false;
      updateCloudChrome();
    }
  }

  async function loadHistory() {
    const session = requireTeamSession();
    if (!session || handoffBusy) return;
    const generation = draftGeneration;
    const panel = byId("historyPanel");
    const trigger = byId("btnHistory");
    const closeHistory = () => {
      panel.hidden = true;
      trigger?.setAttribute("aria-expanded", "false");
      if (trigger) trigger.textContent = "Previous versions";
    };
    if (!panel.hidden) {
      closeHistory();
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
    if (session !== ui.teamSession || generation !== draftGeneration) { closeHistory(); return; }
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
        if (session !== ui.teamSession || generation !== draftGeneration) { closeHistory(); return; }
        const openingKey = currentSelectionKey();
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
        if (session !== ui.teamSession || generation !== draftGeneration || openingKey !== currentSelectionKey()) {
          closeHistory();
          fileNotice("The browser draft changed while opening a previous version. Your current choices were kept.");
          return;
        }
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
        closeHistory();
        render();
        fileNotice("Previous choices loaded into this browser draft. Review them, then Save shared design to create a new revision. Later history is preserved.");
        window.requestAnimationFrame(() => byId("stepPanel")?.focus({ preventScroll: true }));
      });
      li.append(text, button);
      list.appendChild(li);
    }
    panel.replaceChildren(list);
  }

  function bindTablistKeys(tablist) {
    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));
    tabs.forEach((tab, i) => {
      tab.addEventListener("keydown", (e) => {
        let target = null;
        if (e.key === "Enter" || e.key === " ") target = tab;
        else if (e.key === "ArrowRight" || (e.key === "ArrowDown" && tablist.getAttribute("aria-orientation") === "vertical")) target = tabs[(i + 1) % tabs.length];
        else if (e.key === "ArrowLeft" || (e.key === "ArrowUp" && tablist.getAttribute("aria-orientation") === "vertical")) target = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === "Home") target = tabs[0];
        else if (e.key === "End") target = tabs[tabs.length - 1];
        if (!target) return;
        e.preventDefault();
        target.focus();
        target.click();
      });
    });
  }
  function validateV1(payload) {
    const errors = schemaErrors(payload, selectionSchema.properties.legacySelection);
    if (errors.length) throw new Error(errors[0]);
    validateSavedDate(payload.date);
    if (!payload.lesson.title.trim()) throw new Error("Add the lesson title.");
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
    if (theme.catalogIds) {
      const expected = Object.fromEntries(Object.entries({colorLead:'colorLeads',sidebarColor:'sidebarColors',backgroundTexture:'backgroundTextures',titleSlide:'titleSlides',dividerStyle:'dividers'}).map(([field,family])=>[field,`${family}.${theme[field]}`]));
      expected.cards = theme.cards.varyByChapter ? Object.fromEntries(state.meta.chapterKeys.map(chapter=>[chapter,`cards.${theme.cards.chapterStyles[chapter]}`])) : `cards.${theme.cards.lessonWide}`;
      const same = (a,b) => typeof a === 'string' ? a === b : object(a) && object(b) && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key=>Object.hasOwn(b,key)&&same(a[key],b[key]));
      for (const [field,value] of Object.entries(theme.catalogIds)) if (!Object.hasOwn(expected,field)||!same(value,expected[field])) throw new Error(`catalogIds.${field}: reference differs from the selected design.`);
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
function schemaErrors(value,rule,path='$') {
 const errors=[], object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 const types=Array.isArray(rule.type)?rule.type:[rule.type];
 if(!types.some(t=>!t||(t==='object'?object(value):t==='array'?Array.isArray(value):t==='null'?value===null:typeof value===t)))return [path+': invalid field type'];
 if('const' in rule&&value!==rule.const)errors.push(path+': unsupported version');
 if(rule.enum&&!rule.enum.includes(value))errors.push(path+': unavailable choice');
 if(value===null)return errors;
 if(typeof value==='string'){
  if([...value].some(character=>{const code=character.codePointAt(0);return code>=0xd800&&code<=0xdfff;}))errors.push(path+': invalid Unicode text');
  if(rule.maxLength&&[...value].length>rule.maxLength)errors.push(path+': text is too long');
  if(rule.minLength&&[...value].length<rule.minLength&&!path.endsWith('.team.spokesperson.name'))errors.push(path+': text is missing');
  if(rule.pattern&&!new RegExp(rule.pattern).test(value))errors.push(path+': invalid format');
 }
 if(Array.isArray(value)){
  if(rule.minItems!==undefined&&value.length<rule.minItems||rule.maxItems!==undefined&&value.length>rule.maxItems)errors.push(path+': invalid item count');
  if(rule.items)value.forEach((v,i)=>errors.push(...schemaErrors(v,rule.items,path+'['+i+']')));
 }
 if(object(value)){
  for(const k of rule.required||[])if(!Object.hasOwn(value,k))errors.push(path+'.'+k+': missing');
  for(const [k,v] of Object.entries(value)){
   if(Object.hasOwn(rule.properties||{},k))errors.push(...schemaErrors(v,rule.properties[k],path+'.'+k));
   else if(rule.additionalProperties===false)errors.push(path+'.'+k+': unrecognized field');
  }
 }
 return errors;
}
function validateSavedDate(value){
 const date=new Date(`${value}T00:00:00Z`);
 if(Number(value.slice(0,4))<1||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw new Error('The saved date is invalid.');
}
function validateSelectionPayload(payload,{draft=false}={}){
 if(payload?.schema==='bespoke-selection/v1'){validateV1(payload);return;}
 const errors=schemaErrors(payload,selectionSchema);
 if(errors.length)throw new Error(errors[0]);
 validateSavedDate(payload.date);
 if(!payload.lesson.title.trim())throw new Error('Add the lesson title.');
 if(!state.meta.lessons.some(l=>l.id===payload.lesson.id))throw new Error('Choose one of the six planned lessons.');
 if(payload.legacySelection)validateV1(payload.legacySelection);
 const issues=[...Model.validateDesign(catalog,payload.design),...(payload.alternatives?Model.validateDesign(catalog,payload.alternatives.otherDesign):[])];if(issues.length)throw new Error(issues[0]);
 if(JSON.stringify(payload).length>MAX_FILE_BYTES)throw new Error('This design is too large. Keep source material in the team folder.');
}
function buildSelectionPayload(){
 const lesson=findMeta(state.meta.lessons,state.lessonId);
 return {schema:'bespoke-selection/v2',submittedAt:new Date().toISOString(),date:new Date().toISOString().slice(0,10),lesson:{id:state.lessonId,title:lesson.title,displayTitle:state.design.samples.title||lesson.title,subtitle:state.design.samples.subtitle},team:{name:state.teamName.trim(),spokesperson:{name:state.spokespersonName.trim(),email:state.spokespersonEmail.trim()}},design:clone(state.design),...(state.alternatives?{alternatives:clone(state.alternatives)}:{}),unspoken:state.unspoken,...(state.legacySelection?{legacySelection:clone(state.legacySelection)}:{})};
}
function restoreStep(saved){
 const legacyId=saved.stepId||(Number.isInteger(saved.step)?LEGACY_STEPS[saved.step]:null)||'start';
 state.step=['colors','fonts'].includes(legacyId)?stepIndex('slides'):stepIndex(legacyId);
 ui.editorRole=Object.hasOwn(VIEW_NAMES,saved.editorRole)?saved.editorRole:Object.hasOwn(VIEW_NAMES,legacyId)?legacyId:'title';
 ui.sharedThemeOpen=saved.sharedThemeOpen===true||['colors','fonts'].includes(legacyId);
 ui.moreOptions=saved.moreOptions===true||ui.sharedThemeOpen;
 state.previewView=Object.hasOwn(VIEW_NAMES,saved.previewView)?saved.previewView:onStage('slides')?ui.editorRole:'title';
 if(catalog.roles.some(role=>role.id===saved.activeRole))ui.activeRole=saved.activeRole;
 ui.paintScope=saved.paintScope==='shared'?'shared':'slide';
 ui.themeScope=saved.themeScope==='shared'?'shared':'slide';
 ui.meaningfulDesign=saved.meaningfulDesign===true||JSON.stringify(state.design)!==JSON.stringify(Model.defaultDesign(catalog));
 ui.renderedStep=state.step;
 ui.guide=normalizeGuide(saved.guide,buildQuestions(catalog));
}
function loadDraft(){
 try{
  const raw=localStorage.getItem(STORAGE_KEY);
  if(!raw){
   if(localStorage.getItem('bespoke-draft-v1'))ui.restoreNote='An earlier wizard draft is still available in the original wizard. Open its backup here to migrate a copy; the original is kept.';
   return;
  }
  const saved=JSON.parse(raw);
  if(!saved||typeof saved!=='object'||Array.isArray(saved)||!saved.design)throw new Error('Invalid draft');
  const before={...state};
  try{
   for(const key of ['design','alternatives','legacySelection','lessonId','teamName','spokespersonName','spokespersonEmail','unspoken','changes','redo'])if(Object.hasOwn(saved,key))state[key]=saved[key];
   validateSelectionPayload(buildSelectionPayload(),{draft:true});
   if(!Array.isArray(state.changes)||!Array.isArray(state.redo))throw new Error('Invalid history');
   // Undo snapshots are data boundaries too; reject corrupted history before it can reach preview.
   for(const entry of [...state.changes,...state.redo])if(!entry||typeof entry.label!=='string'||schemaErrors({...buildSelectionPayload(),design:entry.design,...(entry.alternatives?{alternatives:entry.alternatives}:{})},selectionSchema).length||Model.validateDesign(catalog,entry.design).length||(entry.alternatives&&Model.validateDesign(catalog,entry.alternatives.otherDesign).length))throw new Error('Invalid history');
   draftGeneration++;restoreStep(saved);ui.autosavePaused=saved.autosavePaused===true;lastSavedRaw=raw;
  }catch(e){Object.assign(state,before);throw e;}
 }catch{storageConflict=true;ui.restoreNote='This browser draft needs recovery. It has not been replaced. Download a backup from the other tab, or open a known backup here.';}
}
function serializeDraft(){
 const {meta,library,editCode,...saved}=state;
 return JSON.stringify({...saved,stepId:STEPS[state.step].id,activeRole:ui.activeRole,paintScope:ui.paintScope,themeScope:ui.themeScope,editorRole:ui.editorRole,sharedThemeOpen:ui.sharedThemeOpen,moreOptions:ui.moreOptions,meaningfulDesign:ui.meaningfulDesign,autosavePaused:ui.autosavePaused,guide:ui.guide});
}
function saveDraft(){
 if(!isLeadSession()||!state.design)return false;
 if(storageConflict){setSaveStatus('Draft needs recovery');return false;}
 try{
  if(localStorage.getItem(STORAGE_KEY)!==lastSavedRaw){storageConflict=true;fileNotice('Another tab changed this draft. Download your backup before reopening the newest browser draft.');return false;}
  state.stepId=STEPS[state.step].id;
  lastSavedRaw=serializeDraft();localStorage.setItem(STORAGE_KEY,lastSavedRaw);
  setSaveStatus(draftStatusText());queueSaveAnnouncement();scheduleAutosave(AUTOSAVE.idleMs);updateCloudChrome();return true;
 }catch{setSaveStatus('Browser storage unavailable. Download a backup.');return false;}
}
function resetDesignForLesson(lessonId){
 draftGeneration++;resetPresetConfirmation();ui.meaningfulDesign=false;ui.startingLooksOpen=false;ui.editorRole='title';const nextDesign=Model.defaultDesign(catalog);if(!keepsGuide({fromLesson:state.lessonId,toLesson:lessonId,fromDesign:state.design,toDesign:nextDesign}))ui.guide=null;ui.sharedThemeOpen=false;ui.paintScope='slide';ui.themeScope='slide';
 Object.assign(state,{step:0,lessonId,teamName:'',spokespersonName:'',spokespersonEmail:'',unspoken:'',design:nextDesign,legacySelection:null,alternatives:null,changes:[],redo:[]});
}
function applySelectionPayload(payload){
 validateSelectionPayload(payload,{draft:true});
 const migrated=payload.schema==='bespoke-selection/v1'?Model.migrateV1(payload,catalog,state.meta):null;
 const nextDesign=migrated?.design||clone(payload.design), issues=Model.validateDesign(catalog,nextDesign);
 if(issues.length)throw new Error(issues[0]);
 const team=payload.team||{};
 if(state.lessonId!==payload.lesson.id||state.teamName!==(team.name||''))resetPresetConfirmation();
 ui.meaningfulDesign=true;ui.startingLooksOpen=false;
 if(!keepsGuide({fromLesson:state.lessonId,toLesson:payload.lesson.id,fromDesign:state.design,toDesign:nextDesign}))ui.guide=null;
 draftGeneration++;
 Object.assign(state,{lessonId:payload.lesson.id,teamName:team.name||'',spokespersonName:team.spokesperson?.name||'',spokespersonEmail:team.spokesperson?.email||'',unspoken:payload.unspoken||'',changes:[],redo:[],alternatives:payload.alternatives?clone(payload.alternatives):null});
 if(payload.schema==='bespoke-selection/v1'){
  state.design=migrated.design;state.legacySelection=clone(payload);ui.autosavePaused=true;
  ui.restoreNote='Converted a copy of the older design. '+migrated.warnings.join(' ')+' The original is included in every backup and can be downloaded on Review. Review this conversion before saving.';
 }else{state.design=nextDesign;state.legacySelection=payload.legacySelection?clone(payload.legacySelection):null;ui.restoreNote='';}
}
function recordChange(label,before){
 const entry={label,design:before,alternatives:clone(state.alternatives||null)};
 const mark=guideMark(ui.guide);if(mark!==undefined)entry.guide=mark;
 state.changes.push(entry);state.changes=state.changes.slice(-40);state.redo=[];
}
function changeDesign(label,edit,{redraw=true,checkpoint=true}={}){
 if(!isLeadSession())return;
 const before=clone(state.design), next=clone(state.design);edit(next);
 if(JSON.stringify(before)===JSON.stringify(next))return;
 next.startingPoint='custom';ui.meaningfulDesign=true;
 if(checkpoint)recordChange(label,before);else state.redo=[];state.design=next;
 saveDraft();if(redraw)render(false);else{updatePreview();updateUndo();}
 byId('saveLive').textContent=label+'. Browser draft updated.';
}
function undoChange(redo=false){
 if(!isLeadSession())return;
 const source=redo?state.redo:state.changes,target=redo?state.changes:state.redo;
 const entry=source.pop();if(!entry)return;
 target.push({label:entry.label,design:clone(state.design),alternatives:clone(state.alternatives||null),...(entry.guide!==undefined?{guide:entry.guide}:{})});
 state.design=entry.design;state.alternatives=clone(entry.alternatives||null);
 const index=ui.guide?.on?indexForMark(ui.guide,entry.guide):null;if(index!==null)ui.guide={...ui.guide,index};
 saveDraft();render(false);
 fileNotice((redo?'Redid: ':'Undid: ')+entry.label);
}
function updateUndo(){
 for(const [id,entries,verb] of [['btnUndo',state.changes,'Undo'],['btnRedo',state.redo,'Redo']]){
  const button=byId(id),entry=entries.at(-1);button.disabled=!isLeadSession()||!entry;
  button.title=entry?verb+': '+entry.label:verb+' · no recent choice';
  button.setAttribute('aria-description',button.title);
 }
 byId('changeList').innerHTML=state.changes.length?state.changes.slice(-8).reverse().map(c=>'<li>'+escapeHtml(c.label)+'</li>').join(''):'<li>Your next choice will appear here.</li>';
}
function choiceGroup(label,options,selected,pick,{mini}={}){
 const fieldset=document.createElement('fieldset');fieldset.className='decision';
 const legend=document.createElement('legend');legend.textContent=label;fieldset.append(legend);
 const group=document.createElement('div');group.className='choice-grid';
 for(const option of options){
  const b=document.createElement('button');b.type='button';b.className='choice';b.id='choice-'+label.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+String(option.id);b.dataset.choice=String(option.id);b.setAttribute('aria-pressed',String(selected===option.id));
  b.innerHTML=(mini?mini(option):'')+'<span>'+escapeHtml(option.label)+'</span>'+(selected===option.id?'<span class="selected-check" aria-hidden="true">✓</span>':'');
  b.addEventListener('click',()=>pick(option.id));group.append(b);
 }
 fieldset.append(group);return fieldset;
}
function miniArrangement(option){return '<span class="layout-mini layout-'+escapeHtml(option.id)+'" aria-hidden="true"><i></i><i></i><i></i></span>';}
function heading(panel,title,description){panel.innerHTML='<h1>'+escapeHtml(title)+'</h1><p class="panel-lead">'+escapeHtml(description)+'</p>';}
function resetPresetConfirmation(){
 skipPresetConfirmation=false;
 try{sessionStorage.removeItem(PRESET_CONFIRM_KEY);}catch{/* Private mode: in-memory preference is already cleared. */}
 if(pendingPreset)finishPresetConfirmation(false);
}
function presetName(preset){return preset.colorLabel+' · '+preset.label;}
function applyPresetChoice(id){
 if(!isLeadSession())return false;
 const preset=catalog.presets.find(item=>item.id===id);if(!preset)return false;
 ui.meaningfulDesign=true;ui.startingLooksOpen=true;
 const samples=clone(state.design.samples);recordChange('Applied '+presetName(preset),clone(state.design));state.design=Model.applyPreset(catalog,preset.id,state.design);state.design.samples=samples;
 state.step=stepIndex('slides');ui.editorRole='title';state.previewView='title';ui.moreOptions=false;render(false);fileNotice(presetName(preset)+' applied. Every choice remains editable.');byId('selectedElement')?.focus({preventScroll:true});return true;
}
function requestPreset(id){
 if(!isLeadSession())return;
 if(JSON.stringify(Model.applyPreset(catalog,id,state.design))===JSON.stringify(state.design)){goStage('slides');return;}
 if(!ui.meaningfulDesign||skipPresetConfirmation){applyPresetChoice(id);return;}
 const preset=catalog.presets.find(item=>item.id===id);if(!preset)return;
 pendingPreset=id;
 byId('presetDialogTitle').textContent='Apply '+presetName(preset)+' preset?';
 byId('presetSkipConfirmation').checked=false;
 byId('presetDialog').showModal();byId('presetCancel').focus();
}
function finishPresetConfirmation(apply){
 const id=pendingPreset;if(!id)return;
 const skip=apply&&byId('presetSkipConfirmation').checked;
 pendingPreset=null;byId('presetDialog').close();
 if(apply&&applyPresetChoice(id)&&skip){
  skipPresetConfirmation=true;
  try{sessionStorage.setItem(PRESET_CONFIRM_KEY,'1');}catch{/* Keep the opt-out only in this page when tab storage is unavailable. */}
 }
 (apply?byId('selectedElement'):byId('preset-'+id))?.focus({preventScroll:true});
}
function builderGuidance(compact=false){
 const saving=ui.localPreview
  ? 'In this local review preview, Save test design and Open test design use this computer’s test space. Nothing is sent or published.'
  : 'Use Save shared design to save with your team, and Open team design to return. Send to Britt requests a design review; it does not build a lesson.';
 const steps='<ol class="how-to-steps"><li><strong>Color &amp; layout.</strong> Start with a color combination and one of twelve editable layouts. Open Lesson &amp; team when needed. A preset can go straight to Review &amp; save.</li><li><strong>Customize.</strong> Click a feature in any of the five slide types to open its controls in the editor sidebar. Shared theme is optional and supplies defaults; fields marked Custom keep their own choices. Editor tabs change what you edit; preview tabs only change what you see.</li><li><strong>Review &amp; save.</strong> Check the effective appearance and fonts for all five designs, then save. These are sample designs and words, not finished lesson content.</li></ol>';
 const rules='<p><strong>Why eleven colors?</strong> These are the approved SPOKES brand colors. They keep lessons recognizable, and you can mix and match all eleven freely. You are not limited to two or three.</p><p><strong>Type, boxes and branding.</strong> Choose heading and body fonts independently from the twelve curated font families. Up to four text boxes keep a slide manageable. The title keeps the SPOKES logo; its position can change, but a watermark does not replace or edit the logo.</p><p><strong>Readability is your decision.</strong> Contrast compares text with its background. Advisories explain when reading may be harder; the team leader can keep and save any palette choice. A passing measurement is not a whole-design accessibility assessment.</p><p><strong>Keep your work.</strong> Undo and Redo restore recent choices. Outside text fields, use Ctrl/Cmd+Z to undo and Ctrl/Cmd+Shift+Z to redo. Text fields keep their normal typing shortcuts. Previous versions lets you reopen shared saves. Files &amp; recovery downloads or opens a backup. Hiding a subtitle, second color or watermark keeps its settings for later.</p><p><strong>Compare for ideas.</strong> The similarity meter compares supported choices with six known lessons. Unmeasured choices do not count. It does not guarantee uniqueness or compare private team designs.</p><p>'+saving+'</p>';
 return steps+(compact?'<p class="helper"><strong>Eleven brand colors, freely mixed.</strong> Readability advice never blocks your color choices.</p><details class="inline-details"><summary>Why these choices and guardrails?</summary>'+rules+'</details>':rules);
}
function showBuilderHelp(close=false){
 const help=byId('builderHelp');help.hidden=close;byId('btnHelp').setAttribute('aria-expanded',String(!close));
 if(close){const menu=byId('filesRecovery');(menu.open?byId('btnHelp'):menu.querySelector(':scope > summary')).focus({preventScroll:true});return;}
 byId('builderHelpContent').innerHTML=builderGuidance();byId('builderHelpTitle').focus();
}
function goStage(id){if(ui.guide?.on&&id!=='slides')ui.guide={...ui.guide,on:false};state.step=stepIndex(id);render();}
function renderTeamStage(panel){
 heading(panel,'Tell us about your team','Choose the lesson, name your team and say who speaks for it. One spokesperson saves the team’s decisions.');
 const fields=document.createElement('div');fields.className='team-stage';panel.append(fields);renderTeam(fields,{heading:false});
}
function renderWelcome(panel){
 heading(panel,'Start with color','Fresh greens, warm golds, crisp whites and deep darks. Twelve editable starting looks—choose the colors that feel right, then make the layout yours.');
 const looks=document.createElement('section');looks.className='starting-looks';panel.append(looks);
 if(ui.meaningfulDesign){
  const title=document.createElement('h2');title.textContent='Continue your current design';looks.append(title);
  const note=document.createElement('p');note.className='helper';note.textContent='Your choices are kept. Edit any slide type, or review and save them together.';looks.append(note);
  const actions=document.createElement('div');actions.className='start-actions';looks.append(actions);
  for(const [id,label,stage] of [['btnContinueEditing','Continue editing','slides'],['btnQuickReview','Review & save','review']]){const b=document.createElement('button');b.id=id;b.type='button';b.className='btn '+(stage==='review'?'btn-primary':'btn-secondary');b.textContent=label;b.onclick=()=>goStage(stage);actions.append(b);}
  const change=document.createElement('button');change.id='btnChangeStartingLook';change.type='button';change.className='text-link';change.textContent='Change starting look';change.setAttribute('aria-controls','startingLookChoices');change.onclick=()=>{byId('startingLookChoices').scrollIntoView({block:'start'});byId('startingLookChoices').querySelector('button')?.focus({preventScroll:true});};looks.append(change);
 }
 const choices=document.createElement('div');choices.id='startingLookChoices';choices.hidden=false;looks.append(choices);
 const grid=document.createElement('div');grid.className='preset-grid';
 for(const preset of catalog.presets){
  const b=document.createElement('button');b.type='button';b.className='preset-choice';b.id='preset-'+preset.id;b.dataset.preset=preset.id;b.setAttribute('aria-pressed',String(JSON.stringify(Model.applyPreset(catalog,preset.id,state.design))===JSON.stringify(state.design)));
  const d=preset.design;
  const thumb=document.createElement('span');thumb.className='preset-slide';thumb.setAttribute('aria-hidden','true');thumb.inert=true;
  const shadow=thumb.attachShadow({mode:'closed'});
  shadow.innerHTML='<style>'+Model.cssForDesign(catalog,d,{canonical:false})+'.preset-canvas{width:800px;transform:scale(var(--thumbnail-scale,.32));transform-origin:top left}.bespoke-slide{width:800px!important;max-width:none!important}</style><div class="preset-canvas">'+Model.renderSlide(catalog,d,'title',{logoUrl:'../SPOKES-Logo.png'})+'</div>';
  b.append(thumb);
  const palette=document.createElement('span');palette.className='preset-colors';palette.setAttribute('role','img');
  const colorIds=[...new Set([d.roles.titleBackground,...(d.slides.title.colors==='gradient'?[d.roles.titleBackgroundEnd]:[]),d.roles.titleText,d.roles.accent])];
  const colors=colorIds.map(id=>catalog.palette.find(color=>color.id===id));
  palette.setAttribute('aria-label','Palette: '+colors.map(color=>color.name).join(', '));
  for(const color of colors){const swatch=document.createElement('i');swatch.style.backgroundColor=color.hex;swatch.title=color.name;swatch.setAttribute('aria-hidden','true');palette.append(swatch);}b.append(palette);
  const name=document.createElement('strong');name.textContent=preset.colorLabel;b.append(name);
  const layout=document.createElement('span');layout.className='preset-layout';layout.textContent=preset.label+' layout';b.append(layout);
  const description=document.createElement('span');description.className='preset-description';description.textContent=preset.blurb;b.append(description);
  b.onclick=()=>requestPreset(preset.id);grid.append(b);
 }choices.append(grid);
 const resize=new ResizeObserver(entries=>{for(const {target,contentRect} of entries)target.style.setProperty('--thumbnail-scale',contentRect.width/800);});
 grid.querySelectorAll('.preset-slide').forEach(node=>resize.observe(node));
 // Disconnect when navigation removes this gallery.
 requestAnimationFrame(()=>{const observer=new MutationObserver(()=>{if(!grid.isConnected){resize.disconnect();observer.disconnect();}});observer.observe(panel,{childList:true});});
 const advanced=document.createElement('details');advanced.className='inline-details';advanced.id='otherStartingPaths';advanced.innerHTML='<summary>Other ways to start</summary><p>Keep your current design, or use the detailed guide.</p>';
 for(const [id,label,fn] of [['btnBuildOwn','Use current design',()=>goStage('slides')],['btnGuideMe','Guide me step by step',()=>guide.start()]]){const button=document.createElement('button');button.id=id;button.type='button';button.className='btn btn-secondary';button.textContent=label;button.onclick=fn;advanced.append(button);}if(ui.guide&&!ui.guide.done){const restart=advanced.querySelector('#btnGuideMe');restart.id='btnGuideRestart';restart.textContent='Start the guide again';const resume=document.createElement('button');resume.type='button';resume.id='btnGuideContinue';resume.className='btn btn-secondary';resume.textContent='Continue guide';resume.onclick=()=>guide.resume();advanced.append(resume);}panel.append(advanced);
}

const SHARED_FIELDS = ['primary','secondary','headingColor','bodyColor','headingFont','bodyFont','pattern'];
const FIELD_LABELS = {primary:'Main background',secondary:'Second background',headingColor:'Heading color',bodyColor:'Supporting / box text color',headingFont:'Heading font',bodyFont:'Supporting / box text font',pattern:'Texture'};
function savedRoleStyle(kind){return {...Model.roleStyleDefaults(catalog,state.design,kind),...state.design.roleStyles?.[kind]};}
function fieldSection(field){return field==='pattern'?'texture':['primary','secondary'].includes(field)?'background':'text';}
function sharedBindings(key){
 const all=Object.keys(VIEW_NAMES),content=['cards','video','activity'];
 const map={titleBackground:[['title','primary']],dividerBackground:[['divider','primary']],contentBackground:content.map(k=>[k,'primary']),titleBackgroundEnd:all.map(k=>[k,'secondary']),titleText:['title','divider'].map(k=>[k,'headingColor']),subtitle:['title','divider'].map(k=>[k,'bodyColor']),heading:content.map(k=>[k,'headingColor']),body:content.map(k=>[k,'bodyColor']),headingFont:all.map(k=>[k,'headingFont']),bodyFont:all.map(k=>[k,'bodyFont']),pattern:all.map(k=>[k,'pattern'])};
 return map[key]||[];
}
function sharedExtraScope(key){return {sidebar:'Shared default for navigation and the video placeholder. Click the navigation sidebar to customize its fill, text and font independently.',accent:'Shared only: rules, navigation markers, rails, frames and activity borders. Arrangements determine where it appears.',button:'Shared default for action-button fill. Click a preview button for its own fill, text color and font.',contentBackground:'Also always changes the lesson canvas and the outside surface of a Band divider.',subtitle:'The shared supporting-text color also supplies the canonical lesson copyright.',titleBackgroundEnd:'The second color is stored on every slide and appears where its two-color finish uses it.',titleText:'Also supplies inherited title/divider watermark color; custom watermark colors stay independent.',heading:'Also supplies inherited content watermark color; custom watermark colors stay independent.',bodyFont:'Navigation and buttons inherit this font until customized in the preview.'}[key]||'';}
function resetSharedField(kind,field){
 state.previewView=kind;
 changeDesign(VIEW_NAMES[kind]+': '+FIELD_LABELS[field]+' uses shared theme',d=>Object.assign(d,Model.setRoleStyle(catalog,d,kind,field,'inherit')));
}
function appendSharedScope(host,key){
 const scope=document.createElement('div');scope.className='shared-scope';scope.dataset.sharedScope=key;
 const bindings=sharedBindings(key),shared=bindings.filter(([kind,field])=>savedRoleStyle(kind)[field]==='inherit'),custom=bindings.filter(([kind,field])=>savedRoleStyle(kind)[field]!=='inherit');
 const p=document.createElement('p');p.className='helper';p.textContent=[shared.length?'Shared: '+shared.map(([kind])=>VIEW_NAMES[kind]).join(', ')+'.':'',custom.length?'Custom, unchanged by this default: '+custom.map(([kind])=>VIEW_NAMES[kind]).join(', ')+'.':'',sharedExtraScope(key)].filter(Boolean).join(' ');scope.append(p);
 if(bindings.length){const links=document.createElement('div');links.className='scope-links';for(const [kind,field] of bindings){const b=document.createElement('button');b.type='button';b.className='text-link';b.dataset.scopeRole=kind;b.dataset.scopeField=field;b.textContent='Edit '+VIEW_NAMES[kind]+' · '+FIELD_LABELS[field].toLowerCase();b.onclick=()=>showRoleEditor(kind,fieldSection(field),field);links.append(b);}scope.append(links);}
 host.append(scope);
}
function renderSharedTheme(panel){
 const details=document.createElement('details');details.id='sharedTheme';details.className='shared-theme';details.open=ui.sharedThemeOpen;
 details.innerHTML='<summary>Shared theme · optional</summary><p class="helper">Edit the slide in the preview, or choose Shared default to coordinate slides that use it. Colors and Fonts &amp; texture each show their scope. Sidebar, Accent and Buttons are always shared.</p>';
 details.addEventListener('toggle',()=>{if(details.isConnected&&ui.sharedThemeOpen!==details.open){ui.sharedThemeOpen=details.open;updatePreview();if(isLeadSession())saveDraft();}});panel.append(details);
 const colors=document.createElement('section');colors.setAttribute('aria-labelledby','sharedColorsTitle');colors.innerHTML='<h2 id="sharedColorsTitle">Paint colors</h2>';details.append(colors);addColorControls(colors,catalog.roles.map(r=>r.id));
 const type=document.createElement('section');type.setAttribute('aria-labelledby','sharedTypeTitle');details.append(type);renderFonts(type);
}
function addColorControls(panel,roleIds){
 if(!roleIds.includes(ui.activeRole))ui.activeRole=roleIds[0];
 // Preview tabs keep the same kind of element selected on the newly visible slide.
 // Merely navigating never materializes a role override or edits the shared theme.
 const previousBindings=sharedBindings(ui.activeRole);
 if(ui.paintScope==='slide'&&previousBindings.length&&!previousBindings.some(([kind])=>kind===state.previewView)){
  const field=previousBindings[0][1];
  ui.activeRole=roleIds.find(key=>sharedBindings(key).some(([kind,keyField])=>kind===state.previewView&&keyField===field))||ui.activeRole;
 }
 const label=document.createElement('label');label.className='field';label.textContent='Element to paint';
 const select=document.createElement('select');select.id='colorRole';
 for(const id of roleIds){const role=catalog.roles.find(r=>r.id===id);const o=document.createElement('option');o.value=id;o.textContent=id==='titleBackgroundEnd'?'Second gradient color':role.label;o.selected=id===ui.activeRole;select.append(o);}
 select.onchange=()=>{
  ui.activeRole=select.value;ui.paintScope='slide';const bindings=sharedBindings(ui.activeRole);
  if(bindings.length&&!bindings.some(([kind])=>kind===state.previewView))state.previewView=bindings[0][0];
  else if(!bindings.length&&ui.activeRole!=='button')state.previewView='cards';
  render(false);
 };label.append(select);panel.append(label);
 const role=catalog.roles.find(r=>r.id===ui.activeRole);
 const binding=sharedBindings(role.id).find(([kind])=>kind===state.previewView);
 const local=binding&&ui.paintScope==='slide',kind=binding?.[0],field=binding?.[1];
 if(sharedBindings(role.id).length){
  const scopeLabel=document.createElement('label');scopeLabel.className='field';scopeLabel.textContent='Apply color to';
  const scope=document.createElement('select');scope.id='colorScope';scope.setAttribute('aria-describedby','colorScopeHelp');
  for(const [id,name] of [['slide','This slide · '+VIEW_NAMES[state.previewView]],['shared','Shared default']]){const option=document.createElement('option');option.value=id;option.textContent=name;option.selected=ui.paintScope===id;scope.append(option);}
  scope.onchange=()=>{ui.paintScope=scope.value;render(false);};scopeLabel.append(scope);panel.append(scopeLabel);
 }
 const hint=document.createElement('p');hint.id='colorScopeHelp';hint.className='helper';
 const effective=local?Model.effectiveRoleStyle(catalog,state.design,kind):null;
 const target=local?VIEW_NAMES[kind]+' · '+FIELD_LABELS[field]:'Shared default · '+role.label;
 hint.textContent=local?target+'. Currently '+(savedRoleStyle(kind)[field]==='inherit'?'Shared':'Custom')+'. Painting changes only this field on this slide.':sharedBindings(role.id).length?'Painting changes this shared default. Slides with a custom color keep it.':'Painting changes '+role.label+' throughout the design.';
 if(local&&field==='secondary'&&effective.backgroundMode!=='gradient')hint.textContent+=' This slide uses one color; the second color is kept until you choose a two-color gradient.';
 if(local&&((field==='headingColor'&&!effective.headingVisible&&!(kind==='activity'&&effective.labelVisible))||(field==='bodyColor'&&!effective.bodyVisible&&!(kind==='divider'&&effective.labelVisible))))hint.textContent+=' This text is hidden; its color is kept until you show it.';
 panel.append(hint);
 if(!local){appendSharedScope(panel,role.id);const note=document.createElement('p');note.className='helper';note.textContent=role.note;panel.append(note);}
 if(role.id==='button')panel.insertAdjacentHTML('beforeend',buttonColorSample('buttonColorInline'));
 if(role.id==='dividerBackground'){
  const links=document.createElement('div');links.className='color-edit-links';panel.append(links);
  for(const [id,label] of [['titleText','Edit divider heading'],['subtitle','Edit divider supporting text']]){
   const edit=document.createElement('button');edit.type='button';edit.className='text-link';edit.id='edit-divider-'+id;
   edit.textContent=label+': '+catalog.palette.find(c=>c.id===Model.effectiveRoleStyle(catalog,state.design,'divider')[id==='titleText'?'headingColor':'bodyColor']).name;
   edit.onclick=()=>showRoleEditor('divider','text',id==='titleText'?'headingColor':'bodyColor');links.append(edit);
  }
 }

 const selected=local?effective[field]:state.design.roles[role.id];
 const palette=document.createElement('div');palette.className='paint-palette';palette.setAttribute('role','group');palette.setAttribute('aria-label',target+' colors');
 for(const color of catalog.palette){
  const available=local?{ok:true,warnings:Model.contrastIssues(catalog,Model.setRoleStyle(catalog,state.design,kind,field,color.id)).filter(issue=>issue.kind===kind).map(issue=>issue.message)}:Model.colorAvailability(catalog,state.design,role.id,color.id);
  const b=document.createElement('button');b.type='button';b.className='paint-chip';b.id='paint-'+role.id+'-'+color.id;b.dataset.color=color.id;b.setAttribute('aria-pressed',String(selected===color.id));
  b.setAttribute('aria-label',color.name+(selected===color.id?' selected':'')+(available.warnings.length?'. Contrast advisory; selectable.':''));
  b.innerHTML='<span class="paint-swatch" style="background:'+color.hex+'">'+(selected===color.id?'<span class="paint-check">✓</span>':'')+'</span><span>'+escapeHtml(color.name)+'</span>';
  b.title='Use '+color.name+' for '+target+(available.warnings.length?'. Contrast advisory: '+available.warnings.join(' '):'');
  b.onclick=()=>{if(!available.ok){byId('colorHelp').textContent=available.reason;return;}changeDesign(target+': '+color.name,d=>{if(local)Object.assign(d,Model.setRoleStyle(catalog,d,kind,field,color.id));else d.roles[role.id]=color.id;});};palette.append(b);
 }
 panel.append(palette);
 const help=document.createElement('div');help.id='colorHelp';help.className='helper';
 const issues=Model.contrastIssues(catalog,state.design).filter(issue=>local?issue.kind===kind||!state.design.roleStyles?.[kind]&&issue.related.includes(role.id):issue.related.includes(role.id));
 help.innerHTML=issues.length?contrastAdvisory(issues):'All 11 brand colors are selectable. Contrast guidance appears here when a choice may be harder to read.';panel.append(help);
}
function renderFonts(panel){
 const kind=state.previewView,local=ui.themeScope==='slide',effective=Model.effectiveRoleStyle(catalog,state.design,kind),saved=savedRoleStyle(kind);
 panel.innerHTML='<h2 id="sharedTypeTitle">Fonts &amp; texture</h2>';
 const scopeLabel=document.createElement('label');scopeLabel.className='field';scopeLabel.textContent='Apply fonts & texture to';
 const scope=document.createElement('select');scope.id='themeScope';scope.setAttribute('aria-describedby','themeScopeHelp');
 for(const [id,label] of [['slide','This slide · '+VIEW_NAMES[kind]],['shared','Shared default']]){const option=document.createElement('option');option.value=id;option.textContent=label;option.selected=ui.themeScope===id;scope.append(option);}
 scope.onchange=()=>{ui.themeScope=scope.value;render(false);};scopeLabel.append(scope);panel.append(scopeLabel);
 const scopeHelp=document.createElement('p');scopeHelp.id='themeScopeHelp';scopeHelp.className='helper';scopeHelp.textContent=local?'Each choice changes just that setting on '+VIEW_NAMES[kind]+'.':'Each choice changes its shared default. Slides with a custom font or texture keep it.';panel.append(scopeHelp);
 const edit=(field,value,label)=>changeDesign((local?VIEW_NAMES[kind]:'Shared default')+' · '+label,d=>{if(local)Object.assign(d,Model.setRoleStyle(catalog,d,kind,field,value));else if(field==='pattern')d.background=value;else d.fonts[field==='headingFont'?'heading':'body']=value;});
 for(const [key,label] of [['heading','Title & heading font'],['body','Body font']]){
  const field=document.createElement('label');field.className='field';field.textContent=label;
  const select=document.createElement('select');select.id='font-'+key;select.setAttribute('aria-describedby',select.id+'-help');
  for(const font of catalog.fonts){const o=document.createElement('option');o.value=font.id;o.textContent=font.label;o.selected=(local?effective[key+'Font']:state.design.fonts[key])===font.id;select.append(o);}
  select.onchange=()=>edit(key+'Font',select.value,label+': '+catalog.fonts.find(f=>f.id===select.value).label);field.append(select);panel.append(field);
  const help=document.createElement('p');help.id=select.id+'-help';help.className='helper';help.textContent=local?(saved[key+'Font']==='inherit'?'Shared':'Custom')+' · '+VIEW_NAMES[kind]+'.':'Shared default · '+label+'.';
  const visible=effective[key+'Visible']||(key==='body'&&kind==='divider'&&effective.labelVisible)||(key==='heading'&&kind==='activity'&&effective.labelVisible);
  if(local&&!visible)help.textContent+=' This text is hidden. The font is kept for when you show it in the slide editor.';
  panel.append(help);if(!local)appendSharedScope(panel,key+'Font');
 }
 const note=document.createElement('p');note.className='font-sample';const bodyFont=catalog.fonts.find(f=>f.id===(local?effective.bodyFont:state.design.fonts.body));note.style.fontFamily='"'+bodyFont.family+'", '+bodyFont.fallback;note.textContent='A clear next step makes a big idea feel possible.';panel.append(note);
 const mini=option=>{
  const sample=local?state.design:{...state.design,roleStyles:{}};
  const trial=Model.setRoleStyle(catalog,sample,kind,'pattern',option.id);
  return '<span class="pattern-mini" aria-hidden="true" style="'+Model.roleBackgroundCss(catalog,trial,kind)+'"></span>';
 };
 const patterns=choiceGroup('Background pattern',catalog.backgrounds,local?effective.pattern:state.design.background,id=>edit('pattern',id,'Texture: '+catalog.backgrounds.find(p=>p.id===id).label),{mini});patterns.setAttribute('aria-describedby','patternScopeHelp');panel.append(patterns);
 const patternNote=document.createElement('p');patternNote.id='patternScopeHelp';patternNote.className='helper';patternNote.textContent=local?VIEW_NAMES[kind]+' texture · '+(saved.pattern==='inherit'?'Shared':'Custom')+'. Thumbnails use this slide’s colors, gradient and '+({subtle:'Subtle',normal:'Standard',bold:'Stronger'}[effective.patternStrength])+' texture strength. Plain removes the texture and keeps its strength for next time.':'Thumbnails show shared colors at Standard texture strength. Plain removes the shared texture; custom slide textures stay independent.';panel.append(patternNote);
 if(!local)appendSharedScope(panel,'pattern');
}
function showRoleEditor(kind,section='background',field='primary'){
 ui.moreOptions=true;
 if(ui.guide)ui.guide={...ui.guide,on:false};
 ui.roleSections||={};ui.roleSections['section-'+kind+'-'+section]=true;ui.editorRole=kind;ui.focusStyleField=field;state.step=stepIndex('slides');state.previewView=kind;
 byId('workspace').dataset.activeSurface='design';document.querySelectorAll('#surfaceSwitcher [role=tab]').forEach(t=>t.setAttribute('aria-selected',String(t.dataset.surface==='design')));
 render();const sectionId='section-'+kind+'-'+section;ui.roleSections[sectionId]=true;if(byId(sectionId))byId(sectionId).open=true;(byId('role-'+kind+'-'+field)||byId(sectionId)?.querySelector('summary'))?.focus();
}
function roleSection(panel,kind,id,label,description,{open=false}={}){
 const details=document.createElement('details');details.className='role-section';details.id='section-'+kind+'-'+id;details.dataset.roleSection=details.id;
 ui.roleSections||={};details.open=Object.hasOwn(ui.roleSections,details.id)?ui.roleSections[details.id]:open;
 const summary=document.createElement('summary');summary.innerHTML='<strong>'+escapeHtml(label)+'</strong><span>'+escapeHtml(description)+'</span>';details.append(summary);
 const body=document.createElement('div');body.className='role-section-body';details.append(body);
 details.addEventListener('toggle',()=>{if(details.isConnected)ui.roleSections[details.id]=details.open;});panel.append(details);return body;
}
function editRoleStyle(kind,key,value){
 state.previewView=kind;ui.previewPinned=false;
 changeDesign(VIEW_NAMES[kind]+': '+key.replace(/([A-Z])/g,' $1').toLowerCase(),d=>Object.assign(d,Model.setRoleStyle(catalog,d,kind,key,value)));
}
function localSelect(host,kind,key,label,options,value,{hint,color}={}){
 const field=document.createElement('label');field.className='field role-field';field.htmlFor='role-'+kind+'-'+key;
 const caption=document.createElement('span');caption.id=field.htmlFor+'-label';caption.textContent=label;
 if(color){const swatch=document.createElement('span');swatch.className='field-swatch';swatch.style.backgroundColor=catalog.palette.find(c=>c.id===color)?.hex;swatch.setAttribute('aria-hidden','true');caption.append(swatch);}field.append(caption);
 const select=document.createElement('select');select.id=field.htmlFor;select.setAttribute('aria-labelledby',caption.id);select.dataset.styleRole=kind;select.dataset.styleField=key;
 for(const item of options){const option=document.createElement('option');option.value=item.id;option.textContent=item.label;option.selected=value===item.id;select.append(option);}
 select.onchange=()=>editRoleStyle(kind,key,select.value);field.append(select);
 const inherited=SHARED_FIELDS.includes(key);
 const description=document.createElement('small');description.className='helper field-scope';description.id=select.id+'-help';description.textContent=[inherited?(value==='inherit'?'Shared · follows the current shared theme.':'Custom · only this slide type; shared edits leave this field unchanged.'):'',hint].filter(Boolean).join(' ');
 if(description.textContent){select.setAttribute('aria-describedby',description.id);field.append(description);}host.append(field);
 if(inherited&&value!=='inherit'){const reset=document.createElement('button');reset.type='button';reset.className='text-link field-reset';reset.dataset.resetShared=kind+'-'+key;reset.textContent='Use shared theme for '+label.toLowerCase();reset.onclick=()=>{resetSharedField(kind,key);byId(select.id)?.focus({preventScroll:true});};host.append(reset);}
 return select;
}
function localToggle(host,kind,key,label,value){
 const field=document.createElement('label');field.className='role-toggle';
 const input=document.createElement('input');input.type='checkbox';input.id='role-'+kind+'-'+key;input.dataset.styleRole=kind;input.dataset.styleField=key;input.checked=value;input.onchange=()=>editRoleStyle(kind,key,input.checked);
 const text=document.createElement('span');text.textContent=label;field.append(input,text);host.append(field);
}
function localText(host,kind,key,label,value,{multiline=false,maxLength=200,hint}={}){
 const field=document.createElement('label');field.className='field';field.textContent=label;
 const input=document.createElement(multiline?'textarea':'input');input.id='role-'+kind+'-'+key;input.dataset.styleRole=kind;input.dataset.styleField=key;input.value=value??'';input.maxLength=maxLength;if(multiline)input.rows=3;
 let checkpoint=false;input.onfocus=()=>{checkpoint=false;};
 input.oninput=()=>{
  if(!isLeadSession()||Model.effectiveRoleStyle(catalog,state.design,kind)[key]===input.value)return;
  if(!checkpoint){recordChange(VIEW_NAMES[kind]+': '+label,clone(state.design));checkpoint=true;}
  ui.meaningfulDesign=true;state.previewView=kind;ui.previewPinned=false;state.redo=[];state.design=Model.setRoleStyle(catalog,state.design,kind,key,input.value);saveDraft();updatePreview();updateUndo();
 };
 field.append(input);if(hint){const small=document.createElement('small');small.className='helper';small.textContent=hint;field.append(small);}host.append(field);
}
function renderSlideChoices(panel,kind){
 const group=catalog.slideGroups.find(g=>g.id===kind),saved={...Model.roleStyleDefaults(catalog,state.design,kind),...state.design.roleStyles?.[kind]},effective=Model.effectiveRoleStyle(catalog,state.design,kind);
 heading(panel,group.label,'Customize this reusable slide design. Local choices affect only '+group.label.toLowerCase()+'. Settings marked “Use shared theme” follow your lesson defaults.');
 const choices=(pairs)=>pairs.map(([id,label])=>({id,label}));
 const colorOptions=key=>[{id:'inherit',label:'Use shared theme · '+catalog.palette.find(c=>c.id===Model.effectiveRoleStyle(catalog,{...state.design,roleStyles:{...state.design.roleStyles,[kind]:{...saved,[key]:'inherit'}}},kind)[key]).name},...catalog.palette.map(c=>({id:c.id,label:c.name}))];
 const fontOptions=key=>[{id:'inherit',label:'Use shared theme · '+catalog.fonts.find(f=>f.id===state.design.fonts[key==='headingFont'?'heading':'body']).label},...catalog.fonts.map(f=>({id:f.id,label:f.label}))];
 const sizes=choices([['small','Smaller'],['default','Match arrangement'],['large','Larger']]),alignments=choices([['layout','Match arrangement'],['left','Left'],['center','Center'],['right','Right']]);
 const arrangement=roleSection(panel,kind,'arrangement','Arrangement',kind==='cards'?'Boxes, title bar and text treatment':kind==='title'?'Composition and required logo':kind==='video'?'Video frame and heading style':'Layout and structure',{open:true});
 if(saved.headingSize!=='default'||saved.headingAlignment!=='layout'||saved.bodyAlignment!=='layout'){const note=document.createElement('p');note.className='helper';note.textContent='Local Text settings override the arrangement’s text size or alignment. Choose Match arrangement in Text to follow it again.';arrangement.append(note);}
 group.decisions.filter(d=>!['colors','watermark'].includes(d.id)).forEach((decision)=>{
  const index=group.decisions.indexOf(decision),label=(index+1)+'. '+decision.label;
  arrangement.append(choiceGroup(label,decision.options,state.design.slides[kind][decision.id],value=>{state.previewView=kind;ui.previewPinned=false;changeDesign(group.label+': '+decision.label,d=>{d.slides[kind][decision.id]=value;});},{mini:decision.id==='layout'?miniArrangement:undefined}));
 });
 const bg=roleSection(panel,kind,'background','Background',effective.backgroundMode==='solid'?'One color':'Two colors',{open:true});
 if(kind==='divider'&&state.design.slides.divider.layout==='band'){const note=document.createElement('p');note.className='helper';note.textContent='Band keeps the shared lesson surface above and below the colored panel. The second color is used only for a gradient.';bg.append(note);}
 localSelect(bg,kind,'backgroundMode','Background finish',choices([['inherit','Use current arrangement'],['solid','Solid · one color'],['gradient','Two-color gradient']]),saved.backgroundMode);
 localSelect(bg,kind,'primary','Main background color',colorOptions('primary'),saved.primary,{color:effective.primary});
 if(effective.backgroundMode==='gradient'||ui.focusStyleField==='secondary'){
  localSelect(bg,kind,'secondary','Second background color',colorOptions('secondary'),saved.secondary,{color:effective.secondary});
  if(kind==='title'&&state.design.slides.title.layout==='split'){
   const note=document.createElement('p');note.className='helper';note.textContent='Split panels uses the second color on the right panel. Choose Solid for one color across both panels.';bg.append(note);
  }
 }else{const note=document.createElement('p');note.className='helper';note.textContent='The second color is kept for when you choose two colors again.';bg.append(note);}
 const texture=roleSection(panel,kind,'texture','Texture',catalog.backgrounds.find(b=>b.id===effective.pattern).label);
 localSelect(texture,kind,'pattern','Background texture',[{id:'inherit',label:'Use shared theme · '+catalog.backgrounds.find(b=>b.id===state.design.background).label},...catalog.backgrounds.map(b=>({id:b.id,label:b.id==='plain'?'Plain · no texture':b.label}))],saved.pattern);
 if(effective.pattern!=='plain')localSelect(texture,kind,'patternStrength','Texture strength',choices([['subtle','Subtle'],['normal','Standard'],['bold','Stronger']]),saved.patternStrength);
 const text=roleSection(panel,kind,'text','Text','Colors, fonts, size, alignment and sample words');
 const headingTitle=kind==='title'?'Title':'Heading',bodyTitle=kind==='cards'?'Box text':'Supporting text';
 const headingFormatting=kind==='activity'&&!saved.headingVisible&&saved.labelVisible?'Activity label':headingTitle,bodyFormatting=kind==='divider'&&!saved.bodyVisible&&saved.labelVisible?'Chapter label':bodyTitle;
 if(['divider','activity'].includes(kind)){localToggle(text,kind,'labelVisible','Show '+(kind==='divider'?'chapter':'activity')+' label',saved.labelVisible);if(saved.labelVisible){localText(text,kind,'labelText',kind==='divider'?'Sample chapter label':'Sample activity label',effective.labelText,{maxLength:80});const note=document.createElement('p');note.className='helper';note.textContent=kind==='divider'?'The chapter label uses the supporting-text typography below.':'The activity label uses the heading typography below.';text.append(note);}}
 localToggle(text,kind,'headingVisible',kind==='cards'?'Show headings':'Show '+headingTitle.toLowerCase(),saved.headingVisible);
 if(kind==='cards'){const p=document.createElement('p');p.className='helper';p.textContent='Show title bar in Arrangement controls the shared heading. This switch also shows or hides box headings.';text.append(p);}
 if(saved.headingVisible||(kind==='activity'&&saved.labelVisible)||['headingColor','headingFont'].includes(ui.focusStyleField)){
  localSelect(text,kind,'headingColor',headingFormatting+' color',colorOptions('headingColor'),saved.headingColor,{color:effective.headingColor});
  localSelect(text,kind,'headingFont',headingFormatting+' font',fontOptions('headingFont'),saved.headingFont);
  localSelect(text,kind,'headingSize',headingFormatting+' size',sizes,saved.headingSize);
  localSelect(text,kind,'headingAlignment',headingFormatting+' alignment',alignments,saved.headingAlignment);
  if(saved.headingVisible&&(kind!=='cards'||state.design.slides.cards.titleBar)) localText(text,kind,'headingText',kind==='title'?'Sample title':kind==='cards'?'Sample title-bar words':'Sample heading',effective.headingText,{maxLength:kind==='title'?catalog.sampleLimits.title:200,hint:'Sample words test the design. They are not approved lesson content.'});
  else if(kind==='cards'){const note=document.createElement('p');note.className='helper';note.textContent='Show the title bar in Arrangement to edit its sample words. Saved words stay in the draft.';text.append(note);}
 }
 localToggle(text,kind,'bodyVisible','Show '+bodyTitle.toLowerCase(),saved.bodyVisible);
 if(saved.bodyVisible||(kind==='divider'&&saved.labelVisible)||['bodyColor','bodyFont'].includes(ui.focusStyleField)){
  localSelect(text,kind,'bodyColor',bodyFormatting+' color',colorOptions('bodyColor'),saved.bodyColor,{color:effective.bodyColor});
  localSelect(text,kind,'bodyFont',bodyFormatting+' font',fontOptions('bodyFont'),saved.bodyFont);
  localSelect(text,kind,'bodySize',bodyFormatting+' size',sizes,saved.bodySize);
  localSelect(text,kind,'bodyAlignment',bodyFormatting+' alignment',alignments,saved.bodyAlignment);
  if(saved.bodyVisible&&kind!=='cards')localText(text,kind,'bodyText',kind==='title'?'Sample subtitle':'Sample supporting text',effective.bodyText,{multiline:true,maxLength:kind==='title'?catalog.sampleLimits.subtitle:1200});
 }
 if(!saved.headingVisible||!saved.bodyVisible){const p=document.createElement('p');p.className='helper';p.textContent='Hidden text and its settings stay in this design. Turn it on to edit or show it again.';text.append(p);}
 if(kind==='cards'){
  const samples=document.createElement('details');samples.className='inline-details';samples.id='boxSampleWords';samples.innerHTML='<summary>Try your own sample text</summary><p class="helper">Keep four examples here. Hidden boxes and hidden text remain recoverable.</p>';
  state.design.samples.boxes.forEach((value,i)=>addSampleField(samples,'box-'+i,'Box '+(i+1)+(i>=Number(state.design.slides.cards.count)?' (kept in draft)':''),value));text.append(samples);
 }
 const watermark=roleSection(panel,kind,'watermark','Watermark',effective.watermarkMode==='off'?'None':'Decorative text');
 localSelect(watermark,kind,'watermarkMode','Watermark',choices([['inherit',kind==='divider'?'Use arrangement’s chapter number':'None · current default'],['off','None'],['text','Custom text or number']]),saved.watermarkMode);
 if(saved.watermarkMode==='text'){
  localText(watermark,kind,'watermarkText','Watermark words or number',saved.watermarkText,{maxLength:40});
  localSelect(watermark,kind,'watermarkColor','Watermark color',colorOptions('watermarkColor'),saved.watermarkColor,{color:effective.watermarkColor});
  localSelect(watermark,kind,'watermarkSize','Watermark size',choices([['small','Small'],['medium','Medium'],['large','Large']]),saved.watermarkSize);
  localSelect(watermark,kind,'watermarkPlacement','Watermark placement',choices([['top-left','Top left'],['top-right','Top right'],['bottom-left','Bottom left'],['bottom-right','Bottom right']]),saved.watermarkPlacement);
  localSelect(watermark,kind,'watermarkOpacity','Watermark strength',choices([['low','Faint'],['medium','Subtle'],['high','More visible']]),saved.watermarkOpacity);
 }
 const watermarkNote=document.createElement('p');watermarkNote.className='helper';watermarkNote.textContent='Decorative words sit apart from the reading text. They do not replace the SPOKES logo. Choosing None keeps your watermark settings.';watermark.append(watermarkNote);
}
function addSampleField(host,key,label,value){
 const field=document.createElement('label');field.className='field';field.textContent=label;
 const input=document.createElement(key.startsWith('box-')?'textarea':'input');input.id='sample-'+key;input.value=value;input.maxLength=key==='title'?catalog.sampleLimits.title:key==='subtitle'?catalog.sampleLimits.subtitle:catalog.sampleLimits.box;if(input.tagName==='TEXTAREA')input.rows=3;
 let checkpoint=false;
 input.addEventListener('focus',()=>{checkpoint=false;});
 input.addEventListener('input',()=>{
  const current=key.startsWith('box-')?state.design.samples.boxes[Number(key.slice(4))]:state.design.samples[key];
  if(!isLeadSession()||current===input.value)return;
  if(!checkpoint){recordChange(label+' edited',clone(state.design));checkpoint=true;}
  ui.meaningfulDesign=true;state.redo=[];state.design.startingPoint='custom';
  if(key.startsWith('box-'))state.design.samples.boxes[Number(key.slice(4))]=input.value;else state.design.samples[key]=input.value;
  saveDraft();updatePreview();updateUndo();
 });field.append(input);host.append(field);
}
function contrastAdvisory(issues){
 return '<strong>Contrast advisory</strong><p>Contrast is the difference between text and its background. Low contrast can make text harder to read.</p><ul>'+issues.map(issue=>'<li>'+escapeHtml(issue.message)+'</li>').join('')+'</ul><p>Consider a different text or background color. The team leader can keep this choice and save the design.</p>';
}
function renderReview(panel){
 heading(panel,'Your design, together','Review each slide type in the preview. Save the agreed design before requesting a review. Building a lesson is a separate step.');
 if(state.alternatives){const note=document.createElement('p');note.className='version-status';note.textContent='Option '+state.alternatives.active+' is chosen for submission. Both options are included in your saved design and review package.';panel.append(note);}
 const errors=Model.validateDesign(catalog,state.design);
 const issues=Model.contrastIssues(catalog,state.design);
 const summary=document.createElement('div');summary.className='review-summary';summary.id='effectiveDesignSummary';summary.innerHTML='<h2>'+escapeHtml(state.meta.lessons.find(l=>l.id===state.lessonId).title)+'</h2><p>Effective appearance for all five slide types. Shared follows your defaults; Custom stays independent.</p>';panel.append(summary);
 const color=id=>catalog.palette.find(c=>c.id===id)?.name||id,font=id=>catalog.fonts.find(f=>f.id===id)?.label||id;
 for(const kind of Object.keys(VIEW_NAMES)){
  const effective=Model.effectiveRoleStyle(catalog,state.design,kind),saved=savedRoleStyle(kind),group=catalog.slideGroups.find(g=>g.id===kind);
  const row=document.createElement('section');row.className='review-role';row.dataset.reviewRole=kind;row.setAttribute('aria-labelledby','review-'+kind+'-title');
  row.innerHTML='<h3 id="review-'+kind+'-title">'+escapeHtml(VIEW_NAMES[kind])+'</h3>';
  const dl=document.createElement('dl');
  for(const [key,label,value] of [['primary','Main background',color(effective.primary)],['secondary','Second background'+(effective.backgroundMode==='solid'?' (kept for two colors)':''),color(effective.secondary)],['headingColor','Heading color',color(effective.headingColor)],['bodyColor','Supporting / box text color',color(effective.bodyColor)],['headingFont','Heading font',font(effective.headingFont)],['bodyFont','Supporting / box text font',font(effective.bodyFont)],['pattern','Texture',catalog.backgrounds.find(b=>b.id===effective.pattern).label]]){
   const dt=document.createElement('dt');dt.textContent=label;const dd=document.createElement('dd');dd.dataset.reviewField=key;dd.textContent=value+' · '+(saved[key]==='inherit'?'Shared':'Custom');dl.append(dt,dd);
  }
  row.append(dl);
  const details=document.createElement('p');details.className='helper';details.textContent=[effective.backgroundMode==='gradient'?'Two-color gradient · '+({right:'left to right',down:'top to bottom',diagonal:'diagonal'}[effective.direction]):'Solid background',...group.decisions.filter(d=>!['colors','watermark'].includes(d.id)).map(d=>d.label+': '+d.options.find(o=>o.id===state.design.slides[kind][d.id])?.label),!effective.headingVisible?'Heading hidden':'',!effective.bodyVisible?'Supporting / box text hidden':'',effective.watermarkMode==='text'?'Custom watermark: '+effective.watermarkText+' · '+color(effective.watermarkColor)+' · '+effective.watermarkPlacement.replaceAll('-',' ')+' · '+effective.watermarkSize+' · '+effective.watermarkOpacity+' strength':effective.watermarkMode==='legacy'?'Arrangement watermark':'No watermark','Texture strength: '+({subtle:'Subtle',normal:'Standard',bold:'Stronger'}[effective.patternStrength]),'Heading: '+({default:'Match arrangement',small:'Smaller',large:'Larger'}[effective.headingSize])+', '+effective.headingAlignment+' aligned, '+effective.headingPlacement+' placement','Supporting / box text: '+({default:'Match arrangement',small:'Smaller',large:'Larger'}[effective.bodySize])+', '+effective.bodyAlignment+' aligned, '+effective.bodyPlacement+' placement',effective.extraText!==null?'Added text: '+effective.extraText:'',kind==='divider'&&state.design.slides.divider.layout==='band'?'Band outer surface: '+color(state.design.roles.contentBackground)+' · Shared':''].filter(Boolean).join(' · ');row.append(details);
  const actions=document.createElement('div');actions.className='review-role-actions';
  for(const [action,label] of [['preview','Preview'],['edit','Edit']]){const button=document.createElement('button');button.type='button';button.className='text-link';button.id='review-'+action+'-'+kind;button.textContent=label+' '+VIEW_NAMES[kind];button.onclick=()=>{if(action==='edit')showRoleEditor(kind);else{showView(kind);if(matchMedia('(max-width:760px)').matches)byId('surface-preview').click();byId('previewTabs').querySelector('[data-view="'+kind+'"]').focus({preventScroll:true});}};actions.append(button);}row.append(actions);summary.append(row);
 }
 const defaults=document.createElement('p');defaults.className='helper';defaults.id='reviewSharedDefaults';defaults.textContent='Shared defaults: '+font(state.design.fonts.heading)+' headings; '+font(state.design.fonts.body)+' body. Navigation and buttons inherit the shared body font unless customized. Sidebar '+color(state.design.roles.sidebar)+', Accent '+color(state.design.roles.accent)+', Buttons '+color(state.design.roles.button)+' are shared defaults.';summary.append(defaults);
 for(const feature of Object.keys(state.design.featureStyles||{})){const style=Model.effectiveFeatureStyle(catalog,state.design,feature),p=document.createElement('p');p.textContent=({sidebar:'Navigation sidebar',button:'Action buttons',box:'Text boxes',titlebar:'Title bar',video:'Video frame',activity:'Activity panel'}[feature])+': '+color(style.background)+' fill'+(['sidebar','button'].includes(feature)?', '+color(style.color)+' text, '+font(style.font):', '+color(style.border)+' border')+'.';summary.append(p);}
 const valid=document.createElement('div');valid.className=errors.length||issues.length?'readability-warning':'review-ready';valid.innerHTML=errors.length?escapeHtml(errors.join(' ')):issues.length?contrastAdvisory(issues):'Contrast guidance is met for the modeled text/background pairs. This is not a whole-design accessibility assessment.';panel.append(valid);
 const label=document.createElement('label');label.className='field';label.innerHTML='Notes for the design review';const notes=document.createElement('textarea');notes.id='reviewNotes';notes.rows=3;notes.value=state.unspoken;notes.oninput=()=>{state.unspoken=notes.value;saveDraft();};label.append(notes);panel.append(label);
 const disclosure=document.createElement('p');disclosure.className='helper';disclosure.textContent=ui.localPreview?'This review preview saves only to the local test service. Nothing is sent to Britt or published.':'A review proposal is stored in a public repository, including both saved options when present. Use work contact details and non-sensitive sample text. A saved design does not authorize a lesson build.';panel.append(disclosure);
 const save=document.createElement('button');save.className='btn btn-primary';save.textContent=ui.localPreview?'Save test design':'Save shared design';save.onclick=()=>cloudSave();panel.append(save);
 const backup=document.createElement('button');backup.className='btn btn-secondary';backup.textContent='Download design backup';backup.onclick=saveTeamFile;panel.append(backup);
 if(state.legacySelection){const p=document.createElement('p');p.className='helper';p.textContent='This design began as an older selection. Its complete original is retained for recovery; the new layout is a conversion to review.';panel.append(p);const b=document.createElement('button');b.className='btn btn-secondary';b.textContent='Download original v1 design';b.onclick=()=>downloadText('original-v1-selection.json',JSON.stringify(state.legacySelection,null,2),'application/json');panel.append(b);}
}
// The team pill asks for attention until the team is identified, then names the team.
// Update it in place: rebuilding the pills while the pointer is down would swallow the click.
function updateTeamPill(){
 const b=byId('stage-team');if(!b)return;
 const at=STEPS.findIndex(step=>step.id==='team'),base=`Stage ${at+1} of ${STEPS.length}: ${STEPS[at].label}`;
 if(teamIdentified()){
  const lesson=state.meta?.lessons.find(l=>l.id===state.lessonId)?.title;
  delete b.dataset.attention;b.title=[lesson,state.teamName.trim()].filter(Boolean).join(' · ');b.setAttribute('aria-label',base);
 }else{
  b.dataset.attention='true';b.title='Add your team name and spokesperson';b.setAttribute('aria-label',base+'. Team details needed');
 }
}
function buildStepper(){
 const list=byId('stepList');list.replaceChildren();
 STEPS.forEach((step,i)=>{const li=document.createElement('li'),b=document.createElement('button');b.type='button';b.id='stage-'+step.id;b.dataset.stage=step.id;b.innerHTML='<span class="step-num" aria-hidden="true">'+(i+1)+'</span><span>'+escapeHtml(step.label)+'</span>';b.setAttribute('aria-label',`Stage ${i+1} of ${STEPS.length}: ${step.label}`);if(i===state.step)b.setAttribute('aria-current','step');
  b.onclick=()=>goStage(step.id);li.append(b);list.append(li);});
 byId('stepCount').textContent='Stage '+(state.step+1)+' of '+STEPS.length;
 updateTeamPill();
}
function selectEditor(kind){
 ui.editorRole=kind;ui.focusStyleField=null;state.previewView=kind;render(false);byId('editor-'+kind)?.focus({preventScroll:true});
}
function renderEditors(panel){
 heading(panel,'Slide designs','Edit only the slide types you need. Every design is ready to review; visiting all five editors is optional.');
 const tabs=document.createElement('div');tabs.id='roleEditorTabs';tabs.className='role-editor-tabs';tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Slide design editors');
 for(const [kind,label] of Object.entries(VIEW_NAMES)){const button=document.createElement('button');button.type='button';button.id='editor-'+kind;button.dataset.editorRole=kind;button.setAttribute('role','tab');button.setAttribute('aria-controls','roleEditorPanel');button.setAttribute('aria-selected',String(kind===ui.editorRole));button.tabIndex=kind===ui.editorRole?0:-1;button.textContent=label;button.onclick=()=>selectEditor(kind);tabs.append(button);}panel.append(tabs);bindTablistKeys(tabs);
 const editor=document.createElement('section');editor.id='roleEditorPanel';editor.setAttribute('role','tabpanel');editor.setAttribute('aria-labelledby','editor-'+ui.editorRole);panel.append(editor);renderSlideChoices(editor,ui.editorRole);
 const roleHeading=editor.querySelector('h1'),h2=document.createElement('h2');h2.textContent=roleHeading.textContent;roleHeading.replaceWith(h2);
 const next=document.createElement('button');next.type='button';next.id='btnNextRole';next.className='text-link';const kinds=Object.keys(VIEW_NAMES),nextRole=kinds[kinds.indexOf(ui.editorRole)+1];next.textContent=nextRole?'Next slide type: '+VIEW_NAMES[nextRole]:'Review & save';next.onclick=()=>nextRole?selectEditor(nextRole):goStage('review');panel.append(next);
}
function renderPanel(){
 const panel=byId('stepPanel'),id=STEPS[state.step].id;
 if(id==='slides'&&ui.guide?.on){guide.render(panel);return;}
 if(id==='team')renderTeamStage(panel);else if(id==='start')renderWelcome(panel);else if(id==='review')renderReview(panel);else renderEditors(panel);
 if(!['team','start'].includes(id)){renderSharedTheme(panel);panel.insertBefore(byId('sharedTheme'),panel.children[2]||null);}
 const nav=document.createElement('div');nav.className='panel-nav';nav.innerHTML='<button class="btn btn-secondary" id="btnBack"'+(state.step===0?' disabled':'')+'>Back'+(state.step>0?': '+escapeHtml(STEPS[state.step-1].label):'')+'</button>'+(state.step<STEPS.length-1?'<button class="btn btn-primary" id="btnNext">'+(id==='team'?'Continue to starting looks':id==='start'?'Customize current design':'Review & save')+'</button>':'');panel.append(nav);
 byId('btnBack').onclick=()=>{state.step=Math.max(0,state.step-1);render();};if(byId('btnNext'))byId('btnNext').onclick=()=>{state.step++;render();};
}
function updateSimilarity(design){
 const comparisons=compareDesign(fingerprints,design,catalog),near=comparisons[0];
 if(!near){byId('distinctMeter').textContent='Reference comparison unavailable';return;}
 byId('distinctMeter').innerHTML='<span class="meter-count">'+near.shared+' <span>of '+near.total+'</span></span><span><strong>'+escapeHtml(near.title)+'</strong><span>Closest reference · exact comparable choices</span></span>';
 const labelOf=e=>typeof e==='string'?e:(e.label||e.key);
 const details=byId('similarityDetails');
 details.innerHTML='<p>This counts matching visual choices, not a perceptual percentage. Unknown features do not count. The six released lessons are the comparison library.</p><h3>Matches</h3><p>'+escapeHtml(near.matches?.length?near.matches.map(labelOf).join(', '):'No measured choices match.')+'</p><h3>Different</h3><p>'+escapeHtml(near.differences?.length?near.differences.map(labelOf).join(', '):'No measured differences.')+'</p><h3>Not comparable</h3><p>'+escapeHtml(near.unknown?.length?near.unknown.map(e=>labelOf(e)+(e.reason?': '+e.reason:'')).join('; '):'All supported characteristics were measured.')+'</p><ul>'+comparisons.map(c=>'<li>'+escapeHtml(c.title)+': '+c.shared+' of '+c.total+'</li>').join('')+'</ul>';
}
function buttonColorSample(id){
 return `<section id="${id}" class="bespoke-slide button-color-sample" aria-label="Button color sample"><div><strong>Button color sample</strong><p>Style preview only; no file opens.</p></div>${Model.renderSampleButton()}</section>`;
}
function updatePreview(design=state.design,{quick=false}={}){
 if(!design)return;
 byId('designStyle').textContent=Model.cssForDesign(catalog,design,{scope:'.bespoke-slide',fontBase:'../fonts',canonical:false});
 const sidebarSampleOpen=byId('modelStage').querySelector('.slide-sidebar-disclosure')?.open===true;
 byId('modelStage').innerHTML=Model.renderSlide(catalog,design,state.previewView,{title:design.samples.title,subtitle:design.samples.subtitle,lessonTitle:state.meta.lessons.find(l=>l.id===state.lessonId)?.title,logoUrl:'../SPOKES-Logo.png'});
 const sidebarDisclosure=byId('modelStage').querySelector('.slide-sidebar-disclosure');
 if(sidebarDisclosure)sidebarDisclosure.open=sidebarSampleOpen;
 previewEditor?.refresh({thumbnails:!quick});
 // A hover preview redraws only the slide. Notes and the meter would change the page height under the pointer.
 if(quick)return;
 // Contextual sample sits outside the slide; cards/title/dividers keep their real structure.
 const buttonSample=byId('buttonColorSample');
 const needsSample=ui.sharedThemeOpen&&ui.activeRole==='button'&&!['video','activity'].includes(state.previewView);
 if(buttonSample)buttonSample.remove();
 if(needsSample)byId('modelStage').insertAdjacentHTML('afterend',buttonColorSample('buttonColorSample'));
 byId('previewName').textContent=VIEW_NAMES[state.previewView];
 document.querySelectorAll('#previewTabs [role=tab]').forEach(t=>{t.setAttribute('aria-selected',String(t.dataset.view===state.previewView));t.tabIndex=t.dataset.view===state.previewView?0:-1;});
 updateSimilarity(design);
 const errors=Model.validateDesign(catalog,design),allIssues=Model.contrastIssues(catalog,design),visibleSurface=state.previewView==='title'?'titleBackground':state.previewView==='divider'?'dividerBackground':'contentBackground';
 const issues=allIssues.filter(issue=>issue.feature==='sidebar'?['cards','video','activity'].includes(state.previewView):issue.feature==='button'?['video','activity'].includes(state.previewView):issue.kind?issue.kind===state.previewView:issue.surface===visibleSurface&&!design.roleStyles?.[state.previewView]);const warn=byId('readabilityNotes');warn.hidden=!errors.length&&!issues.length;warn.innerHTML=errors.length?'<strong>Design needs attention</strong><p>'+escapeHtml(errors.join(' '))+'</p>':issues.length?contrastAdvisory(issues):'';
 for(const suggestion of readabilitySuggestions(catalog,design,state.previewView,issues).slice(0,2)){
  const button=document.createElement('button');button.type='button';button.className='btn btn-secondary';button.textContent=suggestion.label;button.disabled=!isLeadSession();button.onclick=()=>reviewTools.previewFix(suggestion,()=>changeDesign(suggestion.label,d=>Object.assign(d,suggestion.design)),button);warn.append(button);
 }
 const dividerIssues=issues.some(issue=>issue.surface==='dividerBackground');
 const repairs=document.createElement('div');repairs.className='readability-actions';if(issues.length)warn.append(repairs);
 if(dividerIssues){
  const dividerRepair=document.createElement('button');dividerRepair.type='button';dividerRepair.className='text-link';dividerRepair.textContent='Change divider colors';
  dividerRepair.onclick=()=>showRoleEditor('divider','background','primary');repairs.append(dividerRepair);
  // Offer only explicit background repairs; the user's text colors never change here.
  const alternatives=(design.roleStyles?.divider?[]:['dark','royal','mauve','light']).filter(id=>id!==design.roles.dividerBackground&&!Model.colorAvailability(catalog,design,'dividerBackground',id).warnings.length).slice(0,2);
  for(const id of alternatives){const color=catalog.palette.find(c=>c.id===id),repair=document.createElement('button');repair.type='button';repair.className='text-link';repair.id='repair-divider-'+id;repair.textContent='Use '+color.name+' divider background';repair.onclick=()=>{changeDesign('Chapter divider background: '+color.name,d=>{d.roles.dividerBackground=id;});document.querySelector('#previewTabs [aria-selected="true"]').focus({preventScroll:true});};repairs.append(repair);}
 }
 if(issues.length&&!dividerIssues){const repair=document.createElement('button');repair.className='text-link';repair.textContent='Edit '+(issues[0]?.feature?({sidebar:'navigation sidebar',button:'action button',box:'text box',titlebar:'title bar',video:'video frame',activity:'activity panel'}[issues[0].feature]):VIEW_NAMES[state.previewView].toLowerCase())+' colors';repair.onclick=()=>issues[0]?.feature?previewEditor.select(issues[0].feature==='box'?'box-0':issues[0].feature):showRoleEditor(state.previewView,'text',issues[0]?.role==='body'||issues[0]?.role==='subtitle'?'bodyColor':'headingColor');repairs.append(repair);}
 byId('liveRegion').textContent=VIEW_NAMES[state.previewView]+' preview updated.'+(issues.length?' Contrast advisory: '+issues.map(issue=>issue.message).join(' ')+' The team leader can keep this choice and save the design.':'');
}
function showView(view){if(onStage('slides')){ui.editorRole=view;}state.previewView=view;ui.previewPinned=true;if(ui.sharedThemeOpen||onStage('slides'))render(false);else{updatePreview();saveDraft();}}
function render(focus=true){
 if(byId('sharedTheme'))ui.sharedThemeOpen=byId('sharedTheme').open;
 const changed=ui.renderedStep!==state.step;if(changed){ui.renderedStep=state.step;if(onStage('slides'))state.previewView=ui.editorRole;ui.previewPinned=false;}
 const active=document.activeElement,activeId=active?.id;
 ui.roleSections||={};byId('stepPanel').querySelectorAll('[data-role-section]').forEach(d=>{ui.roleSections[d.id]=d.open;});
 const openDetails=new Map(Array.from(byId('stepPanel').querySelectorAll('details[id]')).map(d=>[d.id,d.open]));
 byId('workspace').dataset.stage=STEPS[state.step].id;
 byId('workspace').dataset.editor=String(onStage('slides')&&!ui.guide?.on);
 byId('workspace').dataset.options=String(ui.moreOptions||!onStage('slides')||Boolean(ui.guide?.on));
 byId('btnCloseOptions').hidden=!onStage('slides')||Boolean(ui.guide?.on);
 syncStageChrome(STEPS[state.step].id);buildStepper();renderPanel();byId('stepPanel').querySelectorAll('details[id]').forEach(d=>{if(!d.dataset.roleSection&&d.id!=='sharedTheme'&&openDetails.has(d.id))d.open=openDetails.get(d.id);});syncAccessChrome();lockViewControls();updatePreview();updateUndo();reviewTools?.refresh();
 if(isLeadSession()){if(ui.skipNextLocalSave)ui.skipNextLocalSave=false;else saveDraft();if(changed)scheduleAutosave(AUTOSAVE.stepMs);}
 if(focus&&changed)(byId('workspace').dataset.options==='false'?byId('selectedElement'):byId('stepPanel'))?.focus({preventScroll:true});else if(activeId)byId(activeId)?.focus({preventScroll:true});
}
function setupRecoveryMenu(){
 const menu=byId('filesRecovery'),trigger=menu.querySelector('summary');
 const close=(focus=false)=>{if(!menu.open)return;menu.open=false;if(focus)trigger.focus({preventScroll:true});};
 menu.addEventListener('click',event=>{if(event.target.closest('.more-menu-list button,.more-menu-list a'))close(true);},true);
 document.addEventListener('pointerdown',event=>{if(menu.open&&!menu.contains(event.target))close(false);});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.open){event.preventDefault();close(true);}});
 document.addEventListener('focusin',event=>{if(menu.open&&!menu.contains(event.target))close(false);});
}
function guideHost(){
 const slideOptions=design=>({title:design.samples.title,subtitle:design.samples.subtitle,lessonTitle:state.meta.lessons.find(l=>l.id===state.lessonId)?.title,logoUrl:'../SPOKES-Logo.png'});
 return {
  catalog,slideOptions,
  get design(){return state.design;},
  isLead:()=>isLeadSession(),
  teamComplete:()=>Boolean(state.teamName.trim()&&state.spokespersonName.trim()),
  getGuide:()=>ui.guide,
  setGuide:next=>{ui.guide=next;if(isLeadSession())saveDraft();},
  change:(label,edit)=>changeDesign(label,edit),
  textChange:(label,edit,checkpoint)=>changeDesign(label,edit,{redraw:false,checkpoint}),
  requestPreset:id=>requestPreset(id),
  preview:trial=>updatePreview(trial||state.design,{quick:true}),
  setView:view=>{state.previewView=view;ui.previewPinned=false;},
  rerender:()=>render(false),
  openGuide:()=>{state.step=stepIndex('slides');render();},
  finish:()=>goStage('review'),
  exitToEditor:kind=>{ui.moreOptions=true;ui.editorRole=kind;ui.focusStyleField=null;state.previewView=kind;goStage('slides');byId('editor-'+kind)?.focus({preventScroll:true});},
  announce:text=>{const live=byId('liveRegion');if(live)live.textContent=text;},
  renderTeam:el=>renderTeam(el),
  renderBoxSamples:el=>state.design.samples.boxes.forEach((value,i)=>addSampleField(el,'box-'+i,'Box '+(i+1)+(i>=Number(state.design.slides.cards.count)?' (kept in draft)':''),value)),
  appendScope:(el,key)=>appendSharedScope(el,key)
 };
}
async function init(){
 const paths=['./catalog.json','../SPOKES%20Builder/bespoke-library-catalog.json','./builder-catalog.json','./lesson-fingerprints.json','./selection-v2.schema.json'];
 const data=await Promise.all(paths.map(async url=>{const r=await fetch(url);if(!r.ok)throw new Error('Could not load '+url);return r.json();}));
 [state.meta,state.library,catalog,fingerprints,selectionSchema]=data;state.design=Model.defaultDesign(catalog);
 guide=createGuide(guideHost());
 byId('slideRail').append(byId('previewTabs'));
 const thumbnailMedia=matchMedia('(max-width:1100px)');
 const orientThumbnails=()=>byId('previewTabs').setAttribute('aria-orientation',thumbnailMedia.matches?'horizontal':'vertical');
 thumbnailMedia.addEventListener('change',orientThumbnails);orientThumbnails();
 previewEditor=createPreviewEditor({
  catalog, model:Model,
  context:()=>({design:state.design,kind:state.previewView,editable:isLeadSession(),optionsOpen:ui.moreOptions,mode:ui.guide?.on?'guide':onStage('slides')?'edit':'browse'}),
  activate:()=>{if(ui.guide)ui.guide={...ui.guide,on:false};ui.editorRole=state.previewView;state.step=stepIndex('slides');ui.sharedThemeOpen=false;render(false);},
  change:(label,edit)=>changeDesign(label,edit),
  textChange:(label,edit,checkpoint)=>changeDesign(label,edit,{redraw:false,checkpoint}),
  more:target=>{ui.moreOptions=!ui.moreOptions;if(ui.moreOptions)showRoleEditor(state.previewView,target==='background'?'background':target.startsWith('box')?'arrangement':'text',target.startsWith('body')?'bodyFont':target==='background'?'primary':'headingFont');else{render(false);byId('btnMoreOptions').focus();}},
  thumbnail:kind=>Model.renderSlide(catalog,state.design,kind,{title:state.design.samples.title,subtitle:state.design.samples.subtitle,logoUrl:'../SPOKES-Logo.png'})
 });
 const closeOptions=()=>{ui.moreOptions=false;render(false);byId('btnMoreOptions').focus();};
 byId('btnCloseOptions').onclick=closeOptions;byId('btnHideDrawer').onclick=closeOptions;
 // Show or hide the options drawer by toolbar button, menu command or shortcut (Apple HIG: more than one way to reveal a hidden pane).
 const toggleOptions=()=>{if(byId('workspace').dataset.editor==='true')byId('btnMoreOptions')?.click();};
 byId('btnMenuOptions').onclick=toggleOptions;
 if(/Mac|iPhone|iPad/.test(navigator.platform))byId('optionsShortcut').textContent='\u2318\u2325O';
 document.addEventListener('keydown',event=>{if(event.defaultPrevented||event.repeat||!event.altKey||!(event.ctrlKey||event.metaKey)||event.code!=='KeyO')return;event.preventDefault();toggleOptions();});
 await loadHandoffConfig();const startup=await openShareLink();
 if(ui.localPreview&&!ui.teamSession&&!startup?.snapshot){installTeamSession(state.lessonId,'bespoke-local-preview-synthetic');ui.mode='edit';}
 const mayReplace=Boolean(ui.teamSession)&&(!lastSavedRaw||Boolean(ui.teamSession.baseSelectionKey&&currentSelectionKey()===ui.teamSession.baseSelectionKey));
 byId('btnSave').onclick=()=>cloudSave();byId('btnOpen').onclick=()=>ui.teamSession?fetchSharedDesign():openOpenDialog();byId('btnSend').onclick=()=>cloudSend();
 byId('btnHelp').onclick=()=>showBuilderHelp(!byId('builderHelp').hidden);
 byId('btnCloseHelp').onclick=()=>showBuilderHelp(true);
 setupRecoveryMenu();
 reviewTools=createReviewTools({catalog,context:()=>({design:state.design,alternatives:state.alternatives,kind:state.previewView,lessonTitle:state.meta.lessons.find(l=>l.id===state.lessonId)?.title,editable:isLeadSession()}),change:(label,action)=>{if(!isLeadSession())return;recordChange(label,clone(state.design));action(state);ui.meaningfulDesign=true;saveDraft();render(false);}});
 byId('btnDownloadBackup').onclick=saveTeamFile;byId('btnOpenBackup').onclick=()=>byId('teamFileInput').click();byId('teamFileInput').onchange=async e=>{await openTeamFile(e.target.files?.[0]);e.target.value='';};
 byId('btnLoadLatest').onclick=()=>fetchSharedDesign({replace:true});byId('btnKeepLocal').onclick=()=>fileNotice('Browser draft kept. Download a backup before loading the latest shared version.');
 byId('btnHistory').onclick=loadHistory;byId('btnCheckStatus').onclick=()=>{const pending=pendingSubmission();if(pending?.stage==='receipt')pollSubmission(pending);else if(pending?.stage==='request')cloudSend();};
 byId('btnUndo').onclick=()=>undoChange();byId('btnRedo').onclick=()=>undoChange(true);
 document.addEventListener('keydown',event=>{
  // Preserve native editing and modal cancellation; a held key is one action.
  if(event.defaultPrevented||event.repeat||event.altKey||!(event.ctrlKey||event.metaKey)||!isLeadSession())return;
  const target=event.target;
  if(target instanceof Element&&(target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])')||document.querySelector('dialog[open]')))return;
  const key=event.key.toLowerCase(),redo=(key==='z'&&event.shiftKey)||(key==='y'&&event.ctrlKey&&!event.metaKey&&!event.shiftKey);
  if(key!=='z'&&!redo)return;
  const entries=redo?state.redo:state.changes;if(!entries.length)return;
  event.preventDefault();undoChange(redo);
 });
 byId('openCancel').onclick=()=>byId('openDialog').close();byId('openForm').onsubmit=e=>{e.preventDefault();cloudOpen();};
 byId('presetCancel').onclick=()=>finishPresetConfirmation(false);byId('presetDialog').oncancel=e=>{e.preventDefault();finishPresetConfirmation(false);};byId('presetForm').onsubmit=e=>{e.preventDefault();finishPresetConfirmation(true);};
 byId('presetDialog').onkeydown=e=>{if(e.key!=='Tab')return;const first=byId('presetSkipConfirmation'),last=byId('presetApply');if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}};
 byId('btnRecoverDraft').onclick=()=>{try{const previous=localStorage.getItem(BACKUP_KEY);if(!previous||!confirm('Restore the previous browser draft? Download a backup first if you need this version.'))return;const raw=localStorage.getItem(STORAGE_KEY),current=lastSavedRaw===null&&raw?raw:serializeDraft();localStorage.setItem(STORAGE_KEY,previous);localStorage.setItem(BACKUP_KEY,current);ui.allowUnload=true;location.reload();}catch{fileNotice('Recovery is unavailable. Open a downloaded backup.');}};
 byId('btnLeaveSession').onclick=()=>{if(!confirm('Leave this session on this browser? Download a backup or save first.'))return;forgetTeamSession();try{localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(BACKUP_KEY);}catch{}ui.allowUnload=true;location.reload();};
 byId('btnClear').onclick=()=>{if(!isLeadSession()||!confirm('Start a new browser draft? A recovery copy will be kept. Shared designs remain unchanged.'))return;if(!keepRecoveryCopy())return;ui.guide=null;resetPresetConfirmation();lastSavedRaw=localStorage.getItem(STORAGE_KEY);storageConflict=false;resetDesignForLesson(state.lessonId);ui.autosavePaused=true;render();};
 document.querySelectorAll('#previewTabs [role=tab]').forEach(tab=>tab.onclick=()=>showView(tab.dataset.view));bindTablistKeys(byId('previewTabs'));
 const workspace=byId('workspace'),surfacePositions={design:0,preview:0};
 const sizeSurfaceNavigation=()=>{const height=document.querySelector('.surface-navigation').getBoundingClientRect().height;document.documentElement.style.setProperty('--surface-navigation-height',Math.ceil(height)+'px');};
 new ResizeObserver(sizeSurfaceNavigation).observe(document.querySelector('.surface-navigation'));sizeSurfaceNavigation();
 document.querySelectorAll('#surfaceSwitcher [role=tab]').forEach(tab=>tab.onclick=()=>{surfacePositions[workspace.dataset.activeSurface]=workspace.scrollTop;workspace.dataset.activeSurface=tab.dataset.surface;workspace.scrollTop=surfacePositions[tab.dataset.surface];document.querySelectorAll('#surfaceSwitcher [role=tab]').forEach(t=>t.setAttribute('aria-selected',String(t===tab)));previewEditor.refresh();});bindTablistKeys(byId('surfaceSwitcher'));
 window.addEventListener('storage',event=>{if((event.key===STORAGE_KEY||event.key===null)&&isLeadSession()){storageConflict=true;setSaveStatus('Another tab changed this draft');fileNotice('This tab’s draft is kept. Download a backup before reopening the latest version.');}});
 window.addEventListener('beforeunload',event=>{if(ui.allowUnload||!isLeadSession()||!hasUnsavedTeamWork())return;runAutosave();event.preventDefault();event.returnValue='';});
 window.addEventListener('hashchange',()=>openShareLink().then(()=>render()).catch(e=>fileNotice(e.message)));
 render();saveAnnounceReady=true;
 if(ui.teamSession&&!startup?.snapshot){await fetchSharedDesign({replace:mayReplace});await resumePendingSubmission();}
 autosaveReady=true;scheduleAutosave(AUTOSAVE.idleMs);
 if(ui.localPreview){byId('localPreviewNotice').hidden=false;byId('btnSave').textContent='Save test design';byId('btnOpen').textContent='Open test design';byId('btnSend').hidden=true;}
}
init().catch(error=>{byId('stepPanel').innerHTML='<h1>Could not open the builder</h1><p>'+escapeHtml(error.message)+'</p><p>Your saved draft has not been replaced. Reload once the local server is available.</p>';console.error(error);});
