/**
 * Send: the team's five slides on one sheet beside a summary panel with the two actions.
 * Talks to the builder only through its SendHost. Designs from the host are never changed here.
 */
import { frameSizer } from './slide-frame.mjs';
import { COORDINATOR_NOTE, COORDINATOR_AGREE } from './coordinator-note.mjs';

const DECK = [['title', 'Title slide'], ['divider', 'Chapter divider'], ['cards', 'Text boxes'], ['video', 'Video slide'], ['activity', 'Activity']];
const MAX_CHANGES = 3;
export const SMALL_PRINT = 'Britt gives final approval to every design before it is used in a lesson.';
// Disclosure states outlive a redraw within this page.
let comparisonOpen = false;
let settingsOpen = false;
// The fan settles once each time the confirmation appears, not on every redraw.
let fanSettled = false;

const make = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};

function button(id, cls, text, onClick) {
  const node = make('button', cls, text);
  node.type = 'button';
  if (id) node.id = id;
  node.onclick = onClick;
  return node;
}

/** "A · B · C", then "and N more" past three. */
export function changesText(changes) {
  const shown = changes.slice(0, MAX_CHANGES), more = changes.length - shown.length;
  return shown.join(' · ') + (more ? ` and ${more} more` : '');
}

// Each render is drawn at one size and scaled to its box, so every slide keeps its real layout.
const sizer = frameSizer('--send-scale');
const forget = root => root.querySelectorAll('.send-frame').forEach(node => sizer.forget(node));

function deckSlide(host, design, [kind, label]) {
  const item = make('div', 'send-slide');
  item.dataset.kind = kind;
  const frame = make('div', 'send-frame');
  frame.innerHTML = host.Model.renderSlide(host.catalog, design, kind, host.options(design));
  frame.inert = true;
  frame.setAttribute('aria-hidden', 'true');
  sizer.observe(frame);
  // One button covers the render, so the whole slide opens it and the render keeps no controls of its own.
  const open = button('', 'send-open', '', () => host.openKind(kind));
  open.setAttribute('aria-label', `Open the ${label} in Make it yours`);
  item.append(frame, open);
  return item;
}

function buildDeck(host) {
  const deck = make('div', 'send-deck');
  deck.id = 'sendDeck';
  deck.setAttribute('role', 'group');
  deck.setAttribute('aria-label', 'Your five slides');
  const design = host.design();
  deck.append(...DECK.map(entry => deckSlide(host, design, entry)));
  return deck;
}

function buildHeading(look) {
  const heading = make('h1', 'send-heading');
  heading.id = 'sendHeading';
  heading.tabIndex = -1;
  if (!look) heading.textContent = 'Your design';
  else heading.append(make('b', '', look.name), ', made yours');
  return heading;
}

// The team's shared fonts, which may differ from the starting look's.
export function fontsText(catalog, design) {
  const label = id => catalog.fonts.find(font => font.id === id)?.label ?? id;
  return `${label(design.fonts.heading)} headings with ${label(design.fonts.body)} text`;
}

function summaryRows(host, look) {
  const list = make('dl', 'send-rows');
  const changes = look ? host.changes() : [];
  const rows = [
    look && ['sendLook', 'Look', `${look.name}, ${look.layout}`],
    ['sendFonts', 'Fonts', fontsText(host.catalog, host.design())],
    changes.length && ['sendChanges', 'Your changes', changesText(changes)]
  ].filter(Boolean);
  for (const [id, term, value] of rows) {
    const dd = make('dd', '', value);
    dd.id = id;
    list.append(make('dt', '', term), dd);
  }
  return list;
}

// Send stays off until the team ticks that it read the coordinator note.
function buildCoordinator(host, send) {
  const block = make('div', 'send-coordinator');
  block.id = 'sendCoordinator';
  const note = make('p', '', COORDINATOR_NOTE);
  note.id = 'sendCoordinatorNote';
  const label = make('label', 'send-agree');
  const box = make('input');
  box.type = 'checkbox';
  box.id = 'coordinatorAgree';
  box.checked = host.agreed();
  box.disabled = !host.editable();
  box.setAttribute('aria-describedby', note.id);
  box.onchange = () => {
    host.agree(box.checked);
    send.disabled = !host.editable() || !box.checked;
  };
  label.append(box, ' ', COORDINATOR_AGREE);
  block.append(note, label);
  return block;
}

function buildNotes(host) {
  const label = make('label', 'send-notes', 'Anything Britt should know?');
  label.append(host.notesField());
  return label;
}

function buildActions(host) {
  const actions = make('div', 'send-actions');
  const save = button('btnSendSave', 'btn btn-secondary', host.localPreview ? 'Save test design' : 'Save for the team', () => host.save());
  const send = button('btnSendToBritt', 'btn btn-primary', 'Send to Britt →', () => host.send());
  send.hidden = host.localPreview;
  save.disabled = !host.editable();
  send.disabled = !host.editable() || !host.agreed();
  actions.append(save, send);
  const feedback = make('p', 'send-feedback', host.feedback());
  feedback.id = 'sendFeedback';
  feedback.setAttribute('role', 'status');
  return [actions, feedback];
}

function buildSimilarity(host) {
  const line = make('p', 'send-similarity');
  line.id = 'sendSimilarity';
  const result = host.similarity();
  if (!result) {
    line.textContent = 'Reference comparison unavailable';
    return [line];
  }
  const details = make('div', 'send-comparison');
  details.id = 'sendComparison';
  details.hidden = !comparisonOpen;
  host.fillSimilarityDetails(details);
  const toggle = button('', 'text-link', 'See the comparison', () => {
    comparisonOpen = !comparisonOpen;
    details.hidden = !comparisonOpen;
    toggle.setAttribute('aria-expanded', String(comparisonOpen));
  });
  toggle.setAttribute('aria-expanded', String(comparisonOpen));
  toggle.setAttribute('aria-controls', details.id);
  line.append(`Shares ${result.shared} of ${result.total} choices with the released lessons `, toggle);
  return [line, details];
}

function buildAllSettings(host) {
  const all = make('details', 'send-all');
  all.id = 'allSettings';
  all.open = settingsOpen;
  all.append(make('summary', '', 'See every setting'));
  const body = make('div', 'send-all-body');
  all.append(body);
  host.fillAllSettings(body);
  all.addEventListener('toggle', () => { if (all.isConnected) settingsOpen = all.open; });
  return all;
}

function buildPanel(host) {
  const panel = make('aside', 'send-panel');
  panel.id = 'sendPanel';
  panel.setAttribute('aria-labelledby', 'sendHeading');
  const look = host.look();
  const note = host.sentNote();
  if (note) panel.append(sentNote(note));
  const [actions, feedback] = buildActions(host);
  const coordinator = buildCoordinator(host, actions.querySelector('#btnSendToBritt'));
  panel.append(make('p', 'send-kicker', 'Your suggestion'), buildHeading(look), summaryRows(host, look), coordinator, buildNotes(host),
    actions, feedback, ...buildSimilarity(host), make('p', 'send-fine', SMALL_PRINT), buildAllSettings(host));
  return panel;
}

function sentNote(receivedAt) {
  const note = make('p', 'send-sent-note', `Sent to Britt on ${new Date(receivedAt).toLocaleDateString()}. You have changed it since.`);
  note.id = 'sentChangedNote';
  return note;
}

/** Draws Send into root. Redrawing replaces everything inside root. */
export function renderSendStage(root, host) {
  const body = make('div', 'send-body');
  body.append(buildDeck(host), buildPanel(host));
  forget(root);
  fanSettled = false;
  root.replaceChildren(body);
}

/** Forgets the deck renders when the team leaves Send. */
export function closeSendStage(root) {
  forget(root);
  if (root.hidden) fanSettled = false;
}

// Only links into the curriculum repository are shown, as in the More menu's receipt.
const RECEIPT_LINKS = 'https://github.com/doclegg05/Curriculum-Employability-Skills/';
// The fan stacks activity, divider, then the title slide on top.
const FAN = ['activity', 'divider', 'title'];

function buildFan(host) {
  const fan = make('div', 'sent-fan');
  fan.setAttribute('aria-hidden', 'true');
  if (!fanSettled) fan.classList.add('is-settling');
  const design = host.design();
  for (const kind of FAN) {
    const card = make('div', 'sent-card');
    const frame = make('div', 'send-frame');
    frame.innerHTML = host.Model.renderSlide(host.catalog, design, kind, host.options(design));
    frame.inert = true;
    sizer.observe(frame);
    card.append(frame);
    fan.append(card);
  }
  return fan;
}

function sentDetails(receipt) {
  const details = make('details', 'sent-details');
  details.id = 'sentDetails';
  details.append(make('summary', '', 'Details'));
  const line = make('p', '');
  const link = make('a', '', 'Open review request');
  link.href = receipt.url;
  link.target = '_blank';
  link.rel = 'noopener';
  line.append(link);
  details.append(line);
  return details;
}

const NOTE_SENT = 'Note sent.';
// A follow-up note edits the notes Send used. The host saves, then sends, through its ordinary Save and Send.
// Its message line keeps Send's id, so save and send messages reach it as they reach Send's panel.
function buildFollowUp(host) {
  const area = make('div', 'sent-follow');
  area.hidden = host.localPreview;
  const label = make('label', 'send-notes', 'Add a note for Britt');
  const field = make('textarea');
  field.id = 'sentNote';
  field.rows = 3;
  field.value = host.notes();
  field.setAttribute('aria-describedby', 'sendFeedback');
  label.append(field);
  const feedback = make('p', 'send-feedback', host.feedback() || (host.noteSent() ? NOTE_SENT : ''));
  feedback.id = 'sendFeedback';
  feedback.setAttribute('role', 'status');
  const send = button('btnSendNote', 'btn btn-primary', 'Send note to Britt', async () => {
    send.disabled = true;
    await host.sendNote();
    if (send.isConnected) send.disabled = !host.noteReady(field.value);
  });
  send.disabled = !host.noteReady(field.value);
  field.oninput = () => {
    host.editNote(field.value);
    if (feedback.textContent === NOTE_SENT) feedback.textContent = '';
    send.disabled = !host.noteReady(field.value);
  };
  area.append(label, send, feedback);
  return area;
}

function buildSentText(host) {
  const text = make('div', 'sent-text');
  const heading = make('h1', 'sent-heading', 'Sent to Britt');
  heading.id = 'sentHeading';
  heading.tabIndex = -1;
  const look = host.look();
  const body = make('p', 'sent-body', `Your ${host.lessonTitle()} suggestion, `);
  body.append(make('b', '', look ? `${look.name}, made yours` : 'your design'),
    ', is on its way. It is waiting for Britt\'s approval.');
  const actions = make('div', 'sent-actions');
  actions.append(button('btnKeepEditing', 'btn btn-secondary', 'Keep editing', () => host.keepEditing()),
    button('btnDownloadCopy', 'btn btn-secondary', 'Download a copy', () => host.downloadCopy()));
  text.append(make('div', 'sent-check', '\u2713'), heading, body, actions, buildFollowUp(host));
  const receipt = host.receipt();
  if (receipt?.url?.startsWith(RECEIPT_LINKS)) text.append(sentDetails(receipt));
  text.firstChild.setAttribute('aria-hidden', 'true');
  return text;
}

/** Draws the Sent to Britt confirmation into root, in place of Send's content. */
export function renderSentView(root, host) {
  const view = make('div', 'sent-view');
  view.id = 'sentView';
  view.setAttribute('aria-labelledby', 'sentHeading');
  view.setAttribute('role', 'region');
  view.append(buildFan(host), buildSentText(host));
  forget(root);
  fanSettled = true;
  root.replaceChildren(view);
}
