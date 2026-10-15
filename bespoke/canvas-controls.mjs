/**
 * Toolbar controls shaped after Apple's Human Interface Guidelines: a segmented
 * control for a few closely related choices, and a color well that opens a swatch
 * picker. Each wraps the native <select> the editor already owns. The select stays
 * in the DOM as the source of truth, hidden from sight and assistive technology.
 */
const make = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const hideNative = select => {
  select.classList.add('native-mirror');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');
  return select;
};

// Alignment and placement read faster as icons; each segment keeps its text as a tooltip and accessible name.
const bar = (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="2" rx="1"/>`;
const frame = '<rect x="2.5" y="2.5" width="11" height="11" rx="1.5" fill="none" stroke="currentColor"/>';
const ICON_PATHS = {
  left: bar(2, 3, 12) + bar(2, 7, 8) + bar(2, 11, 12),
  center: bar(2, 3, 12) + bar(4, 7, 8) + bar(2, 11, 12),
  right: bar(2, 3, 12) + bar(6, 7, 8) + bar(2, 11, 12),
  top: frame + bar(5, 4, 6),
  middle: frame + bar(5, 7, 6),
  bottom: frame + bar(5, 10, 6)
};
const icon = name => `<svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" aria-hidden="true" focusable="false">${ICON_PATHS[name]}</svg>`;

/** Ids of toolbar fields that read best as a segmented control, and their size limit. */
export const SEGMENTED_FIELDS = ['size', 'align', 'placement', 'finish'];
export const MAX_SEGMENTS = 5;

export function segmentedControl({id, title, select, options, value, editable, onChoose}) {
  const wrapper = make('div', 'toolbar-field toolbar-segmented');
  const group = make('div', 'segmented');
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-label', title);
  const segmentId = optionId => `context-${id}-seg-${optionId}`;
  const choose = optionId => {
    if (!editable || String(optionId) === String(value)) return;
    select.value = String(optionId);
    onChoose(String(optionId));
    document.getElementById(segmentId(optionId))?.focus({preventScroll: true});
  };
  // Apple HIG: use text or images in a control, never a mix.
  const icons = options.every(option => ICON_PATHS[String(option.id)]);
  for (const option of options) {
    const checked = String(option.id) === String(value);
    const segment = make('button', icons ? 'segment segment-icon' : 'segment', icons ? undefined : option.label);
    if (icons) {
      segment.innerHTML = icon(String(option.id));
      segment.setAttribute('aria-label', option.label);
    }
    segment.type = 'button';
    segment.id = segmentId(option.id);
    segment.setAttribute('role', 'radio');
    segment.setAttribute('aria-checked', String(checked));
    segment.tabIndex = checked ? 0 : -1;
    segment.title = option.label;
    segment.disabled = !editable;
    segment.onclick = () => choose(option.id);
    group.append(segment);
  }
  group.onkeydown = event => {
    const step = {ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1}[event.key];
    const ends = {Home: 0, End: options.length - 1}[event.key];
    if (step === undefined && ends === undefined) return;
    event.preventDefault();
    const at = options.findIndex(option => String(option.id) === String(value));
    const next = ends ?? Math.min(options.length - 1, Math.max(0, at + step));
    choose(options[next].id);
  };
  wrapper.append(make('span', 'toolbar-label', title), group, hideNative(select));
  return wrapper;
}

export function colorWell({id, title, select, swatches, value, editable, onChoose}) {
  const wrapper = make('div', 'toolbar-field toolbar-well');
  const current = swatches.find(swatch => swatch.id === value) ?? swatches[0];
  const well = make('button', 'well');
  well.type = 'button';
  well.id = `context-${id}-well`;
  well.disabled = !editable;
  well.setAttribute('aria-haspopup', 'dialog');
  well.setAttribute('aria-expanded', 'false');
  well.setAttribute('aria-label', `${title}: ${current.name}`);
  const chip = make('span', 'well-chip');
  chip.style.background = current.hex;
  well.append(chip, make('span', 'well-name', current.name));

  const popoverId = `context-${id}-popover`;
  let popover = null;
  const outside = event => { if (!wrapper.contains(event.target)) close(false); };
  function close(returnFocus) {
    popover?.remove();
    popover = null;
    well.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', outside, true);
    if (returnFocus) well.focus({preventScroll: true});
  }
  function open() {
    // Swatches exist only while the picker is open, so a closed toolbar holds no hidden controls.
    popover = make('div', 'well-popover');
    popover.id = popoverId;
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-label', title);
    const group = make('div', 'swatch-grid');
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-label', title);
    for (const swatch of swatches) {
      const button = make('button', 'swatch');
      button.type = 'button';
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', String(swatch.id === value));
      button.setAttribute('aria-label', swatch.name);
      button.title = swatch.name;
      const dot = make('span', 'swatch-dot');
      dot.style.background = swatch.hex;
      button.append(dot);
      button.onclick = () => {
        select.value = swatch.id;
        close(false);
        onChoose(swatch.id);
      };
      group.append(button);
    }
    popover.append(group);
    wrapper.append(popover);
    well.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', outside, true);
    (popover.querySelector('[aria-checked=true]') ?? popover.querySelector('button'))?.focus({preventScroll: true});
  }
  well.onclick = () => (popover ? close(true) : open());
  wrapper.onkeydown = event => {
    if (event.key === 'Escape' && popover) {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
  };
  wrapper.append(make('span', 'toolbar-label', title), well, hideNative(select));
  return wrapper;
}
