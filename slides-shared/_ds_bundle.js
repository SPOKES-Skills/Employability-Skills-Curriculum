/* @ds-bundle: {"format":3,"namespace":"SPOKESDesignSystem_8b5e5e","components":[{"name":"AreaCard","sourcePath":"components/content-blocks/AreaCard.jsx"},{"name":"Card","sourcePath":"components/content-blocks/Card.jsx"},{"name":"ContentList","sourcePath":"components/content-blocks/ContentList.jsx"},{"name":"DangerCard","sourcePath":"components/content-blocks/DangerCard.jsx"},{"name":"VisualCircle","sourcePath":"components/content-blocks/VisualCircle.jsx"},{"name":"ActivityBox","sourcePath":"components/controls/ActivityBox.jsx"},{"name":"Button","sourcePath":"components/controls/Button.jsx"},{"name":"DownloadResource","sourcePath":"components/controls/DownloadResource.jsx"},{"name":"SpokesLogo","sourcePath":"components/controls/SpokesLogo.jsx"},{"name":"SpokesWordmark","sourcePath":"components/controls/SpokesWordmark.jsx"},{"name":"WippeaBadge","sourcePath":"components/controls/WippeaBadge.jsx"},{"name":"BigStatement","sourcePath":"components/frameworks/BigStatement.jsx"},{"name":"Emphasis","sourcePath":"components/frameworks/BigStatement.jsx"},{"name":"Matrix","sourcePath":"components/frameworks/Matrix.jsx"},{"name":"SmartStack","sourcePath":"components/frameworks/SmartStack.jsx"},{"name":"SplitLayout","sourcePath":"components/frameworks/SplitLayout.jsx"},{"name":"Takeaways","sourcePath":"components/frameworks/Takeaways.jsx"}],"sourceHashes":{"components/content-blocks/AreaCard.jsx":"c116cc10f58a","components/content-blocks/Card.jsx":"a00da0fabea3","components/content-blocks/ContentList.jsx":"dd86a9558c8d","components/content-blocks/DangerCard.jsx":"721dfa6d1849","components/content-blocks/VisualCircle.jsx":"9c1f5d607d4e","components/controls/ActivityBox.jsx":"6e68ef9af43e","components/controls/Button.jsx":"60a38c3babeb","components/controls/DownloadResource.jsx":"552857180603","components/controls/SpokesLogo.jsx":"c5fa3928b25a","components/controls/SpokesWordmark.jsx":"4a8933a8ba30","components/controls/WippeaBadge.jsx":"51b0496a033a","components/frameworks/BigStatement.jsx":"0d69f35dc180","components/frameworks/Matrix.jsx":"134169899d77","components/frameworks/SmartStack.jsx":"877f1cd406d7","components/frameworks/SplitLayout.jsx":"d89d3587f3f9","components/frameworks/Takeaways.jsx":"b2193c588f32","ui_kits/lesson/LessonViewer.jsx":"29914d9ac9f0","ui_kits/lesson/slides.jsx":"b9461bdf57d1"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.SPOKESDesignSystem_8b5e5e = window.SPOKESDesignSystem_8b5e5e || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/content-blocks/AreaCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * AreaCard — one column of the 3-column areas-grid. A solid-fill panel (blue
 * by default, gold via `variant="gold"`) with a centered circular icon, a
 * serif title, and a bulleted list. Use exactly three across, pattern
 * blue / gold / blue.
 */
function AreaCard({
  title,
  icon,
  items = [],
  variant = "blue",
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const isGold = variant === "gold";
  const fg = isGold ? "var(--dark)" : "var(--light)";
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      flex: 1,
      background: isGold ? "var(--gold)" : "var(--primary)",
      borderRadius: "var(--radius-xl)",
      padding: "2rem",
      color: fg,
      transition: "transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)",
      transform: hover ? "translateY(-5px)" : "none",
      boxShadow: hover ? "var(--shadow-hover)" : "none",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginBottom: "1.5rem"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "60px",
      height: "60px",
      background: isGold ? "var(--dark)" : "var(--accent)",
      color: isGold ? "var(--gold)" : "var(--light)",
      borderRadius: "var(--radius-round)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: "1.75rem",
      margin: "0 auto 1rem"
    },
    "aria-hidden": "true"
  }, icon), /*#__PURE__*/React.createElement("h4", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: "1.5rem",
      fontWeight: "var(--fw-regular)",
      margin: 0,
      color: fg
    }
  }, title)), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: "none",
      margin: 0,
      padding: 0
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "1.25rem",
      padding: "0.5rem 0 0.5rem 1.5rem",
      position: "relative",
      color: isGold ? "var(--dark)" : "rgba(255,255,255,0.85)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 0,
      color: isGold ? "var(--dark)" : "var(--gold)"
    },
    "aria-hidden": "true"
  }, "\u2022"), it))));
}
Object.assign(__ds_scope, { AreaCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content-blocks/AreaCard.jsx", error: String((e && e.message) || e) }); }

// components/content-blocks/Card.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Card — the SPOKES info card used in cards-grid. A muted panel with a thick
 * left accent border (green by default, gold via `border="gold"`), a serif
 * title, and body copy. Hover lifts it 5px with a soft shadow.
 */
function Card({
  title,
  children,
  border = "accent",
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const borderColor = border === "gold" ? "var(--gold)" : "var(--accent)";
  return /*#__PURE__*/React.createElement("div", _extends({
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      background: "var(--muted)",
      padding: "2rem 2.5rem",
      borderRadius: "var(--radius-lg)",
      borderLeft: `6px solid ${borderColor}`,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      transition: "transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out)",
      transform: hover ? "translateY(-5px)" : "none",
      boxShadow: hover ? "var(--shadow-hover)" : "none",
      ...style
    }
  }, rest), title ? /*#__PURE__*/React.createElement("h4", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: "1.75rem",
      color: "var(--primary)",
      margin: "0 0 1rem",
      fontWeight: "var(--fw-regular)"
    }
  }, title) : null, children ? /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "1.5rem",
      lineHeight: "var(--lh-body)",
      color: "var(--gray)",
      margin: 0
    }
  }, children) : null);
}
Object.assign(__ds_scope, { Card });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content-blocks/Card.jsx", error: String((e && e.message) || e) }); }

// components/content-blocks/ContentList.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * ContentList — a simple arrow-prefixed list. Default uses a green → arrow;
 * `variant="danger"` swaps to a gold ⚠ warning glyph.
 */
function ContentList({
  items = [],
  variant = "default",
  style,
  ...rest
}) {
  const isDanger = variant === "danger";
  return /*#__PURE__*/React.createElement("ul", _extends({
    style: {
      listStyle: "none",
      margin: "1rem 0 0",
      padding: 0,
      ...style
    }
  }, rest), items.map((it, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "1.5rem",
      padding: "0.6rem 0 0.6rem 2rem",
      position: "relative",
      color: "var(--gray)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      left: 0,
      color: isDanger ? "var(--muted-gold)" : "var(--accent-text)",
      fontWeight: "var(--fw-bold)"
    },
    "aria-hidden": "true"
  }, isDanger ? "\u26A0" : "\u2192"), it)));
}
Object.assign(__ds_scope, { ContentList });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content-blocks/ContentList.jsx", error: String((e && e.message) || e) }); }

// components/content-blocks/DangerCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * DangerCard — a 3D flip card. The front shows an icon + title on a dark navy
 * face; hover (or focus/tap) flips 180° to a gold back revealing a short
 * detail. Use 4–6 across in a row for dangers, myths, or challenges.
 */
function DangerCard({
  icon,
  title,
  detail,
  style,
  ...rest
}) {
  const [flip, setFlip] = React.useState(false);
  const face = {
    position: "absolute",
    inset: 0,
    backfaceVisibility: "hidden",
    WebkitBackfaceVisibility: "hidden",
    borderRadius: "var(--radius-xl)",
    padding: "1.25rem",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    tabIndex: 0,
    onMouseEnter: () => setFlip(true),
    onMouseLeave: () => setFlip(false),
    onFocus: () => setFlip(true),
    onBlur: () => setFlip(false),
    style: {
      flex: 1,
      perspective: "1000px",
      cursor: "pointer",
      height: "200px",
      minWidth: "110px",
      outline: "none",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: "100%",
      height: "100%",
      transition: "transform 0.6s",
      transformStyle: "preserve-3d",
      transform: flip ? "rotateY(180deg)" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...face,
      background: "var(--dark)",
      color: "var(--light)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "2.5rem",
      marginBottom: "0.75rem"
    },
    "aria-hidden": "true"
  }, icon), /*#__PURE__*/React.createElement("h4", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "1.1rem",
      fontWeight: "var(--fw-semibold)",
      margin: 0
    }
  }, title)), /*#__PURE__*/React.createElement("div", {
    style: {
      ...face,
      background: "var(--gold)",
      color: "var(--dark)",
      transform: "rotateY(180deg)"
    }
  }, /*#__PURE__*/React.createElement("h4", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "1rem",
      fontWeight: "var(--fw-semibold)",
      margin: "0 0 0.5rem"
    }
  }, title), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "0.85rem",
      lineHeight: 1.4,
      margin: 0
    }
  }, detail))));
}
Object.assign(__ds_scope, { DangerCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content-blocks/DangerCard.jsx", error: String((e && e.message) || e) }); }

// components/content-blocks/VisualCircle.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * VisualCircle — the large gradient circle that anchors a split-layout, with a
 * single glyph or short text centered inside. Four brand gradient options.
 */
function VisualCircle({
  children,
  gradient = "primary",
  size = 250,
  style,
  ...rest
}) {
  const grad = {
    primary: "var(--grad-title)",
    gold: "var(--grad-gold)",
    accent: "var(--grad-accent)",
    royal: "linear-gradient(135deg, var(--mauve), var(--dark))"
  }[gradient] || "var(--grad-title)";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "var(--radius-round)",
      background: grad,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--light)",
      fontSize: `${size * 0.2}px`,
      flexShrink: 0,
      ...style
    },
    "aria-hidden": "true"
  }, rest), children);
}
Object.assign(__ds_scope, { VisualCircle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/content-blocks/VisualCircle.jsx", error: String((e && e.message) || e) }); }

// components/controls/ActivityBox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * ActivityBox — gold-bordered callout for a group activity, discussion, or
 * hands-on exercise. An uppercase label sits above one or two sentences of
 * instruction. Usually placed at the bottom of a text column.
 */
function ActivityBox({
  label = "Group Activity",
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      background: "rgba(211,178,87,0.1)",
      border: "2px solid var(--gold)",
      borderRadius: "var(--radius-lg)",
      padding: "1.5rem 2rem",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "0.8rem",
      textTransform: "uppercase",
      letterSpacing: "var(--ls-eyebrow)",
      color: "var(--muted-gold)",
      fontWeight: "var(--fw-bold)",
      marginBottom: "0.5rem"
    }
  }, label), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "1.25rem",
      lineHeight: "var(--lh-body)",
      color: "var(--dark)",
      margin: 0
    }
  }, children));
}
Object.assign(__ds_scope, { ActivityBox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/controls/ActivityBox.jsx", error: String((e && e.message) || e) }); }

// components/controls/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SPOKES Button — the program's action control.
 * Three brand variants mapped to their real jobs in a lesson:
 *   - download (green)  ↓  student handouts / worksheets
 *   - video    (gold)   ▶  video resources
 *   - primary  (blue)       generic call-to-action
 * Hover lifts the button 2px and deepens the fill; press settles + shrinks.
 */
function Button({
  children,
  variant = "primary",
  href,
  icon,
  disabled = false,
  onClick,
  style,
  ...rest
}) {
  const palette = {
    primary: {
      bg: "var(--primary)",
      fg: "var(--light)",
      glow: "rgba(0,123,175,0.35)",
      mark: null
    },
    download: {
      bg: "var(--accent)",
      fg: "var(--light)",
      glow: "rgba(55,181,80,0.4)",
      mark: "\u2193"
    },
    video: {
      bg: "var(--gold)",
      fg: "var(--dark)",
      glow: "rgba(211,178,87,0.4)",
      mark: "\u25B6"
    }
  }[variant] || {};
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.75rem 1.5rem",
    background: palette.bg,
    color: palette.fg,
    border: "none",
    borderRadius: "var(--radius-md)",
    fontFamily: "var(--font-body)",
    fontSize: "1.1rem",
    fontWeight: "var(--fw-semibold)",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    transition: "transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out), filter var(--dur-base) var(--ease-out)",
    transform: disabled ? "none" : active ? "translateY(0) scale(0.97)" : hover ? "translateY(-2px)" : "none",
    boxShadow: !disabled && hover && !active ? `0 5px 20px ${palette.glow}` : "none",
    filter: !disabled && hover ? "brightness(0.92)" : "none",
    ...style
  };
  const handlers = disabled ? {} : {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => {
      setHover(false);
      setActive(false);
    },
    onMouseDown: () => setActive(true),
    onMouseUp: () => setActive(false),
    onClick
  };
  const content = /*#__PURE__*/React.createElement(React.Fragment, null, icon ?? palette.mark ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, icon ?? palette.mark) : null, children);
  if (href && !disabled) {
    return /*#__PURE__*/React.createElement("a", _extends({
      href: href,
      style: base,
      target: "_blank",
      rel: "noreferrer"
    }, handlers, rest), content);
  }
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    style: base,
    disabled: disabled
  }, handlers, rest), content);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/controls/Button.jsx", error: String((e && e.message) || e) }); }

// components/controls/DownloadResource.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * DownloadResource — the soft blue-tinted container that flags an instructor
 * or student resource on a slide, with one or more download/video buttons.
 * Pass an array of resources; each renders as a Button (download or video).
 */
function DownloadResource({
  prompt = "Instructor Resource Available",
  resources = [],
  children,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      alignItems: "center",
      gap: "1rem",
      padding: "1rem 1.5rem",
      background: "rgba(0,123,175,0.06)",
      borderRadius: "var(--radius-lg)",
      border: "1px solid rgba(0,123,175,0.1)",
      alignSelf: "flex-start",
      flexWrap: "wrap",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "0.9rem",
      color: "var(--gray)",
      fontStyle: "italic",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem"
    }
  }, prompt), resources.map((r, i) => /*#__PURE__*/React.createElement(__ds_scope.Button, {
    key: i,
    variant: r.variant || "download",
    href: r.href,
    style: {
      fontSize: "0.95rem",
      padding: "0.6rem 1.2rem"
    }
  }, r.label)), children);
}
Object.assign(__ds_scope, { DownloadResource });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/controls/DownloadResource.jsx", error: String((e && e.message) || e) }); }

// components/controls/SpokesLogo.jsx
try { (() => {
// The official SPOKES logo (bridge + mountains wordmark), embedded as a data
// URI so it renders everywhere the bundle loads with no asset-path config.
// The raw file also lives at assets/SPOKES-Logo.png for direct use.
const LOGO_SRC = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAyAAAAIUCAYAAADi7EhnAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAdqNJREFUeNrsvc+PJMt23xd3dKVHkNKberRJ0ZToqZGgZz2K0lRbEGhLi8n2Vovp/gumeuVld21n092bu+2enXdds/JO3QOIAkjA6OwFARMyPDUw4CdQpifHMgVSEnjrSqQsEhSu81SenM6urh8ZWZGZEZmfD1C3585UV2VGxok434hzThgDAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAYX9EEAAAAAM3w679xOEp/DDa953f+8XVMSwECBAAAAADKioxh+iNKX/LzpQqOUYWPSvQ1S1+f5SfiBBAgAAAAAAgOERoHKjYis2WHwwEiQu7S100qSGYdbtd8t2ior21IW8xFtKXtktAzESAAAAAAXRQdr0213Q1XJCpI3oYqRtK2zHeIRLy90D8PHXz0TF8fDbtHCBAAAACAQJ3lsYqOyMPLEzHyNn1NU2d77nk7jszDXaOmuDH3u0cJPRoBAgAAAOCjsywr9CI8jo2blfm6maujfe6Tk627RscqPHxoR9kdeReCYEOAAAAAAPRHfJykP05N/XkddXGpQmTeYhseqPCIPG6nqQk4jA0BAgAAABC+8BBn+cqEseOxjbmKkMuG23Cs4i2kNoy1rWKsAAECAAAA0ITTPFDhcdDB25PV/aO6V/k7It5ibasEq0CAAAAAANTpOF+bcMOtyjKpYzdEczxEeEQdaqvWQ9gQIAAAAADdFB9nJgsX6guSpH7kyrHuQK7MJhJtqxhLQYAAAAAA7Oo4dznkahs7h2Rp+8muUdSD9rpM22qC1SBAAAAAAKo6zyN1noc9bgbZAdmvIkK0/W5N90PWlkXbPiFZu/GEJgAAAIAeio+xOs/DnjeFiIcP2h627fehZ+JDENH1ScUXIEAAAAAASjnPFyYLuxrQGl+40nYp035X2n6INqgEIVgAAADQF+HRp3yFqqxNTtf2k10jVv/vkVPUj2gGBAgAAADAsvPcx3yFqjzKc6D97NoLNkMIFgAAAHRdfIxNP/MVqvIgz4H2s2sv2A47IAAAANBV4SEOs+Q1jGmNSsiKvqzuRzRFaSR8bUozIEAAAACgf+JjaLJ8D1aloWnIC0GAAAAAQM/ER6Tig5AhaAvyQjZADggAAAB0SXycGJKloX3IC9kAOyAAAADQBeEhgkPOpjigNcAzyAtZgh0QAAAACF185CViER/gI6UPeewL7IAAAABAyOJDRAenmkMIxOnrkLwQdkAAAAAgXPFxZkg2h3CI0tcH8kLYAQEAAICqvLkerXH+h/pax8uS3yCf/chZ+wtf/5n58d+OzQ+f/gHPAEJEdkAmfc4LQYAAAAD0VzCscvCfrRAPK4VAG/zsz/2R+fFPYvODH/wxzxNC5zIVIRMECAAAAPgsIKINouDpCpEQden2f+EXf888e/7PFzsgAB0hNj3MC0GAAAAANCsihubhDkNRJCzvPqwLceodIjx+6Zd/SkNAF0lUhMwQIAAAALBNTBQFQlFYLO9GICQqIrsdv/prv7UIvQLoML3KC0GAAAAAZGKiGNK0HN5UTJqOaKxmENEh4oOQK+gRvcgLQYAAAECXRUW0Qjg83SA0wBMk3ErCrgB6SGw6nheCAAEAgJAERVEwDM19yNMLcx/iFNFQ4SK7HSI8JOEcoMckpsN5IQgQAABAVIAXSGldKbFLvgfAgs7mhSBAAACgLmGRJ14XBUaxyhOiAr7ww6d/aH78t2/J9wB4TOfyQhAgAABgKyxy4TAsiIk8SZuciu6S6GuZO8v3Z3xzGOd//PXfODxLf5x2tN3iFe0Ub3h/sWLai4JNUUWt30if6UxeCAIEAADKCIvi30HYoiF3hGU3arz0b9P09S59zVKBULujkwoPcaqv0tdBR9panMSPi/ZLX66dxbS9IrVDESYRYr+X9tyJvBAECABA94XFqlCofGUVYREWIhA+bxAYSSocEgvBebv0t+fp7581cSOpMz1S8RGqEy3i4kYFXZw6hUnTF5C24dUKERky81y8pa/v9OdCxKXtG5cQs8u5ZHnIZ9SxNgo+L+RrxnIAgKDFRT6x5iKDHAu/Hauc3MFa/W+y+/Dm+vbRM/zm8KgLjZE6iwcqPgYBPkcRHe9TB/CmxfaTdrvugI3HKuDyHaPKIk53m+INbZYLkdB3jxa7hun9vAg5LwQBAgDgp7AorublTga7Fv6JCfnzcviQ/Js4BuV3I3pE6jhdpD9OArtseaZvRXy0HYOvO0fXgY4BiQq4u6YFnIqb6ZKIE9t9qT9DE8Mn2heCzAtBgAAANC8ucgFRFBl5rgXJpu04RUnhz59X/v06MfHm+vtHAqWQYA0PHL7QVu3lOZ5vC/9psA3H6Y+LwMaIfNforU+5C+q0T/V1pLtyr01Y+UhiS7fptR+FlheCAAEAcCsuNu1cIC6ac3hmS4JiVcJ1Y/kOiI/gVu29Eh7ahqHtHCULG/Ng16ikIBGRdKOhWjJWHAcyXo8KIuQmlM6BAAEAsBMYUWHQHxjCopp0ZhL9czF/Iv4iOr45nG15bmOasRXHWdr9KqB+duSZ8Aht58g78WYpRKQPyMLEmfbd0wDG9kUfSa9X2v0MAQIAEJa4GBaEhLyemse7GeCO4k5FUVSs2q04IqwpSPERUpUm75y3wCqFeSfeHIiRafpjmj6HExUivu+InEpyuj4Hr3edECAA0CeBke9asHtRvyOSqMD4uPR3ZquQeBPGCh5sdJzFrm4DcZxn6rDNPGvDUCqFzVW8XXa1P8u9pc9jqiLE9zA46TdD3/NCECDgYpCM9I+rnLgHK5xdOcETvBUYeV/Mf75c+n/YjbggJopnUSyfYP2O3IrezwnXJoz4eS9DVgI6GT5W8ZZ0vV+r/zJJn817FYZDjy/X+7wQBAjYDoojVdcvtIMPLX8/FyT5wU0xrQoIjNbJD/sq7ljci41NpWSzZ3JKE4KO8bI6fBFIn/dx1yOUk+E7v+uxQYjE6XPaM/7vhnidF4IAgTIDogyEr4ybOtkDdRYXTkv62fJ3+aFOU1obgYHAcEpi7hO37/TnsliIU4GxT1OBA8dZhMc4gMv1ddcjlHyP2PRk12ODCAlpN8TLvBAECGyaTGQiOW7AsETYHGiJQTnoadrnga3jAmM5BwOBUZ1810Js5bNZTuj+5nC+5hmwWwGu5wuZI64DcJy93PXQNgwh36O3ux4bhEgouyH5jtohAgR8Fh4npp361wM1YlHrlzrQkTMSlsDIxcVQX8/0J+df2BEXHCapDPX60ULAN4tJDwDHuRzelicNJN9DIhUmLA6uFCG+74bM9dlNfbooBAgsTyQXnhiPiKCxxi6y2uKXyMjFRKR/89I8PNEb7MRFYvKKUevOsXhz/dJQpQtwnKvg865HCPkec22/G3r8ViGS74aceGIX8uwkquTSx8VcBAj4PAguYorT63tleh5v2oLIiAqigl0MO2cnD4U6eSQ8yLUA5owm8XnXI4R8jxsTwHkSnokQaSs5wPCm5ec7Ndmuh7fPDgHCRCLGcW38Xl0VZ/hDeq2HVM1yJjCWQ6Xy8zAiGmctiXl4tsV9zsWqcy3eXJ/QZMCc0dpCgLdnIAQQtsaux+5CRPreXgu7hMGEyiFA+j2RhBK7a/Qab30tJ4fI6ASxWb3L83xjGVqA/swZY5OF6fo8Z3g9RwQQtsauh1sh0tRuSKx9Pw6lbRAg/Z1IfB8E1yEJ6hIPf8gA+UVoROY+XAqRsZp8t+LxORfF3Ys317eP2g7xAWC0SqHPu3q+73r4HrbGrkd9IqTO3ZBEhcc0tHZBgPRvEgkldncT4iDmIVmzXjy4h4nf5GSUZ29tYnf9z2qZkQqcstwV/jzkUUKLc8a18XtRw/ddD9/zPdj1aEaIuNwNWSSYhxwRggDp10QSyiFHZRiqCDnqzAGGj0OmqC51T1J4yZkXT02Z1dg6xUe285Qn6Ref2zpsd6aiLd8vYmam7TEzm87+AKg+Z9wafxc6vN710Db0OdSZXY/mRYiL3ZBOHFOAAOnPRBJSvocNVxqSNQnGGN9c545qpI70yLCbscqxmJh1pWkz5/+k4Wcm3/lCf/ogCqNHIuXNdR5qJrsnMaIEdpgzxjpn+EgQq7+ehzqz69GuEKmyGxKbDlUERYD0YyLxeRB0gUyUIw3J8scwHwqNZ4U/95VYf+btstnBWFVZqp3n+MmEEwI1KAiTU73+mbb9XeEZAGyaM650XPV1HPHaCfM81JldD39ESNndkMWCXNeqgCJAuj2JdCHfoyyygpCHZDU7sCI0lhHH4J0pnolRXIXPQof8c+iz57hqF2rYAduQF2WBYSM/+MEfmx//JPZ1sUrGEO8PpvU81JldDz+FyLrdEC9PMEeAQMiDYF0skiVrK9V7n6NRjPuPet7V5GC920cC5JvDsyCuPhMdItBfm/7m2gzTdjhInxkroj3mh0//0Pz4b9+av/D1n/l4ebEJIPTE41Bndj38FyHLuyHnxtMTzBEgEOIg2BS7l+rNHNNcbLw05cKGusLMZLsYH8194rf83eNKOBIm9eY6rLvLhKTYyLEhwd9ov77W/BFxUN4jRvrFL/3yT82z5//cx0sLYtdD593ccfQNdj3CEiLSj876cK8IkO6JD18HwaYRR/lT2h77WyukZGVT8zM0+rSrcWNWV2aarDnZO+y7zRLXZadjjHmsZKBtM1YxMjUSStd0GWNoDNn1+C9/8f8yv/CLv+fj5cUmjF0PX0Od2fUABEiPxUBkHuYFbCqpmugrPyhtUVaz7ODbs3wPG4dK8kImX1bQ+iU2YnNfttasEKZvzapKSl3jzbU41ex22NvOyeKVJbG/XQhWKmp1aX5K7eE3Lzy8tJB2PXwNdWbXAxAg/RvQF87cqwpO3dDch/gcFD4z0cHkbt1KRk/zPWy4+NX/+X98/bs//R+Gf/7nnQ9LE2dx/5GjmK3+929n7M31t4byxruSjy8XaXvKGHTO6fDBz1W+hunGJpAyo7rAeO1ZG7LrAQiQHg3kdceTiyhZrESm35WHRbzNB2jyPcrxV374b0Y/+bXfMr/3L/+h+Y9/8vNduKXDRZz+m+vvH01ArFIXadouEnOfM/Nd4f+zfyvjuD88ST3/87PCIsWwxbYcmyxEK1YhEtPFgpuzzjxcjAhm10Pb8GQhyP2CXQ9AgPRIeJyo8GjKyRkUxIgIkc+GfI/S/OzP/ZH51YUI+Ufm2z/6FZ8v9dzkJWyzJO9VDgOTTPvE+pyykElXuRIPPyfeIFKGpr0iCdHi9WaxEMJqazhz1uNCEn7YUSi7HgMVHmPPxBu7HoAA6clAfqIOYZu7DmOehD1SYvLHP7k1f/Cvf2I+f/oHbV6KTLZyVsYrs7xzFkoJ234xN8XD/NpOzM6+f/bA+c+qe0UFUdKEoymih/NF/J+zRio+hp7ZVEi7HkNtQ59Cndn1AARIjwZxci06gJSd/Nmf+9b87r+IzH/+879U19fE5j4J/PSRABGh8eb6JU/DW/ITxN8HEWqUhd7dLImSSIVIU4IE/Ju3xiZbtfcpTDc2gex6aBtGxq98D3Y9AAHSo0Hcx5hP2IEfPv0Ds/f3/0kqQvbNv//ur+46GQyWnMGvHvz/m2tC5VyRhaQd1yg63pms4lMSfFtlwinWdst3SGTX7aBmZ+r1Ijzrm0WoKLQ3b8mc5dsOVT0HxfZn7hebmrDrAQiQ7g/gPsZ8+kCir7uC47ZuQCyWH35pNpcjbhQJyfrJr/3mIhxLwrIs2VuEwry5vjWsLjchPA7UFoc19OV3i4m9y9WdHu6QHOnuSC5GXLepfN6VCu8JBxu2Mm/dGr9262WOONp6LhNz/6ZxStovpocDAqT7g7hMor7FfLY5ebw3mnhbYfXlZkX7RsaT8BA5BVh2RCRBvRCSFes9z3QiWs7V4IC2ZoRH5sy67yNTkx20188J/X53ZKJJ7cfG/c5INoZSNavJeWuk4sOnkKvLdM6YMPdXbz+T7Ryx6wEIkB4M4pHxr8Z3G6JjEY5SR6yuruTE2t55OeN8RbZxfvTz/0qrZH0p1XuXOkz5AYYM/M0Lj7zqm8vwtUT79CXlih+J6SOT7YyI/b12bIfZYsOb66nhHJE6562xinVfkOcc1Kq9Z3O/2OWEXQ9AgDCI9wVxEt42uVWuKzvyvVNdfZJn0GSJ4wV5qV4Jyfq3/+ZvYgztIX3gg3EXGpSd5k1OQhkxkoVpZTtPYxUjrp7DeCFs3ly/pdqb0znLx1DhqQksV8GzfI+gcmUAECC7D0BXpr/5HlMd9JI2L0K//yx9FrL70PRZK4u8kL/xt37b/NIv/58v/g9Mok0B4oLYEPpTVYgs7HDxynZFxA4jB58stnyafqYImyOezc5zltiKT+FCwVVo8kzAxSrcCPEFBEhPBnEfk/Z6PeDpytmZHrook0OjoVk/+3PfHqTfLavw+7/z29hIgH0a4eFOjBR3RU4dOWrDxZj75vpGhQghcfbzVmT8ChUO7lwKjwRcUOeiAOzKE5rgS9Lepx6Kj7kKj32fV1tkRyR9HaZ/PDTNnwC+6BuDH/3+EEsJRnjsp87sPuKjFiEipXUlV+T5QuC5sceDxfj75npMA1vNW2fGn2TzfC45DEx8iID74MHcL2PVHuID+kTvd0B6nO8hA14wB0GpELlJn1esz6vJ3ZDBf/Or/8ugYqleaAbpx4TzNClEstAsV2GSA5OV7c3CsmDTnDVoYQzs1Fyi7ehDvkcu3Kb0bECA9Gsg73O+h6z4DNVxCwZdXTtMn92BTsKNrf6tKdULHkzgJJe3JkTmjoVIZLIV6YTGfYwUyTB+hQoHlyjtUb5HcOFqAC7pZQiWDEAa2z/u8bNf5LzoKlBwaILjc7PifJE6kVK9f3f0T3NHANrlctEHEB9+CJGsqtVzfS67jk2cvbRi7JEKfZ60jYTs7gUoPoYq4Nqc+0VcH4YWrgaAANl9AOprvsc6LmQnSFeFQhMh8zZyQ37wgz9eOAIavgc2ZHH+u9pebLJT6CckLnspRCYqRBCGjpDd1x//5HZRoc8H4Z+Ou3uhVWnyJN/jUoXbDb0aECD9Eh9jHYAGPPoHSLvc6upQcLSxG6KOwJWG8cF24TFIX9JWu4TNLcp7aoI5JSr9FiJ5svq+CkaowF/8i//J/OTXfsv80i//1IfLSeR5hnSieWHul53+NhP2v7Qdux4APRMg6ijiLK5HVoU+aG5FiCJk3lKlrPHfHf3TSHZFYK34GJrdwx4ykUm4VWhCJF4IxiyxPNnx0y7SvtSbnWvZrf97/+3NSPLOPEDsbi+0E7k13PrKtJtsfh5i2wEgQNwMQH3P9yiLrA5da3nHICnshjTmqEo+iOSF/PDpH9KDHosPEbS7hD0sig6kTuwh4VZBC5GFA2t2yw9ZLJKkfeqk682lu/W3X3/9Z23v1i/sLx1Xg0uW9iDf40ueDLseAD0TIOR7VOY0bbvrEPNCVITIbkge/pE08Z0SkvWTX/tN89f/64/0nnvxIUJ2l0PS8l0P4qW7IULy/BARIvEOn3SxCOeTsL5uzlu7hiq6YmF/IeYr6NzfVr5HfqDgHqeZA/RQgJDvsTOLlWsdyINEt7x3XXW14q/9ysdFsmio4s0Reb7H6Q4TOLse3RUiMw3Lmpjq4ZIyvt92KSTLo936IA8V9GTuX8w5oVUHA0CAuBuAyPdww9BkyenjUG9Ad0PE0WlsN0TKZYYu3nZktIMTJRM4ux79ECKXZrfdkJGKkIPQm8Kj3frcgb4MtB3bmvtz0bYf2oGMAAgQN4OPz/kecx3cN7183K5dnLqbtutFyH2jhd2QoYqQsYGyTLTCFbse/REhyY67IYu8NQ33C3XekpwWH3brz0N1oFue+29CFm0AbdGZk9B1BanNMntFxNm9U0GR2MaBavjOSF8vzf2p5W1yom0c7OFJet2T9D7em2yVrIk2FfH28n/7nT/j9PT1iMNzSGndXguRy1RE3KhdRhU+4TT9/RcmK9McxPjk0YncYndHoeYrtDj3z7Xd2K0F6KsA0VXmNkOuxIGSQei9i1J76ijH+rrUexRnWUINXpv2tunFMfiUXst+yMl18ozSe9gzWY5CExV1xnJw4e/+NDJ/+qd/mVHnITchOY1QqwiRcXRfdzOq5A8dLBYV3lwf6mf5PGfJeH5t2g+5ugzxXA8P5v6pyUKuGLcAKhJ8CFbL+R4yCIkz/lwPGIrr+iLZFpctXqmsYbIys+emoZyGJWSVKfjQoqZzQ/JSvZof0h2yZPOqnJNoDiuEiAiQvYp2mZfq9Tb/Ss9aavtE7sQEeqhgy3N/3m5HiA+AngqQFmM+5+r8P9dBKG763lWMSG1xESIuDviqQidOAW8yN0RK9UqFrI6V6h1XtKF9dTQBVomQmdpllfCWgYqQsW+3pWcs7VKa2gVTE/DBeC3O/ZeGAwUBnBFkCJbGfMogPmxh4D73KUkvvRa5pqkmMp42PLGNC3khSahG0HRuiJTq/S9+4f8e/kw6kf7Ob/duzBHH0vsQGfBChGTlmLODB6sUwcjOCsmqbbXuNOvY0mbFruBzFlrK95Axa4LwAHBLcDsg+QmxDYsPcZbybVcvHSetwCE7Ik1PLouQh/S5RKEbQ2E3ZFr3d/3Mz/wH6b8f/vJf+XdD0x+kb+4jPsBSiOTlequEvFzsGCbo0mk+aNn2ngcuPmTub7paWH6gIOIDoM8CREvBNn1CbDDbrprXcGhk1bD6AV9VkOdxq7swoYuQ/BT1Jtpw+Hf+3j8b/tIv/7QPYw35HrCLCJFVaFlgqTIOj1WENB72VFgwayvfI+hDBQvt2HS+R2w4UBAAAVIQH006uInRJL3QBm5d5WpjN+RCJoounAJeaMPaheez5//c/I2/9duLHBFvyZJ6hxV/+4h8D3AgQuZ6Zsi0kghpOGG5pQWzVU50sOdTtJDvUTxQkLLgAAiQhUM4MVnCdRNiIPhksxZ3Q2SiuO3CKeDahrscklaaX/jF3zNSqleqZXkqPqqEPUqb7aVO49QAuBMiRzoX2NKIEJCFhJ/82m9FptkFs2WCP5W7hdPhgxdsAAiQ+hxCcWTyErR1OIQyWAe567GhzdrYDRmpCDnoSBvKhCRCpNYVMREfIkK8ard78TGoYkscLgg1iZCpqZ4XUqsNS7ntHz79g7YuYdYFJ7rhfI88OT9owQaAAKnfGZxrXKY41VOHH93ZEnst7YbIxHGtZSe70IYzPYPlvM7v0TCsaw3fCFV8ZCVUER9QrwiZNbEwUBbZxRTx8YMf/HFbl5AnTAdtdw3ne+TJ+VMMCgABYuNUH5nd4/QT07Fdjw1t1sZuyGk6odx2IS9E2/DMNHN44Umr7bab+Ngn2Rz6JEIkh0teLZHPYWeBC48m8z2kzQ5DT84HQIC06xAmGqdfZRLq3cFCLe2GRCYr1TvqSBtKf2miXK+026eng3/9ouFbrCo+pqlDuIf4gIZFyFzH/yr2eLzLqenpmDYUp1l2P1qiE3NYw/keeZvdYDwA7fFV125IY0cvtjhPicliPuM+P/wWDsfKK4xMO9SGB6aBSjefP/0D8wf/+ifFv5Jdhjh1nr5femuslYIe8uY6UlHx8DMykXPq4BKnmhwM0B5Zud1xhXHJOl9Jzz5q61Tz4A8VXJqzmwi5Yt4H8IgnXbuhEonqvdv12NBWTe+GLASPF/kN7tqwkXK9Uqr3xz+59bVUL+ID/CDrh7YJ2ItzjGx2QvTMo6ZP5M4J/lDBQjueNSQ+zpn3Afziqy7fnGyPm2x1d2xY/djWVk3vhixit7sUf6tOyWmdTsl//JOfN7/3L/+h/PRlBwTxAf7x5npcwbHduhOi4+SFae5ciuXr68wOsiab192OM533KYgB4BlPunxzmh8izpHE67P6sbmtmt4NWcT8diUvRNuw9nK9eaneF3//2od2Q3yAn2Rlem375sadEB2rblsSH7HOYYiP8mKtE1XBABAgYTuGMypdlG6rJitlyYT/QWOAu9TXai3XK2FYP/Mz/+Gi5VC2c8QHdFSEXKciZLDkMB+o+GhD+E+6dEaFhl3VOebnYu0MIwBAgEBYTnTTuyGSF3LVlVK92oYy+dVdrvdEzh3YMS+kSoWty9S5Y3KHroqQocl2QgYFh7mNZPNOHCq4JD5EeJzW9PHzrok1AAQI9FWINLkbIhPTrebtdKX9YlNzuV4Jydr7+//E/PDpH1b5ddlBsc35kbCrCdYBHRcho6//4p/KeHRdo8O8ic6FD2kIW127tjddE2sAXecrmgBKTh6NlJs12SrWYdfydZpoPy3Va5OEbgs5HxAuFonpIux/nJpSC6eaJ6aDxVJ0d7uOELbOlCMG6BvsgEApGtwNWUxUGvbQxfarzbGQUr1/5+/9s2FNoWyIDwibkjshcqigFHpoQXx0uUT8aQ3iQ57nc8QHQJiwAwLWNLgbIhPLUdcKCDRQrjcx2S7SffjGbjsgiA/oDht2QkTE/9Iv/7TpK+r0Kr6GXn1wPL5RUh8gcNgBAWsa3A1ZVJ7pUqlebb+6y/UOtd3GDj4L8QHdYsVOiBRykIIOLYiPzhwquAGXeR8cJAzQEdgBgZ1QJ1cmmDp3Qzq7QqihZnUmuU4XZ+FU2wFZHBaZOmyUsIbu8WZRqe40P1tnx2pyVca0zhwquGF8qzLurBuLJggPAAQIQHGSGZospCGq+asu0wlo0sH2i7T9hjV9xezj/35g/tP/90ObnSTEB3Sev/4/nd3+tV/5GDX8teJEH/WhVGw6tt06mBfOOdMDAAECsGmykdyGug/Hk8n7sIN5IQNtu3Edn/+f//wvmd/9F/vm33/3V8u8XRyjPcQHdHisqtXeNjDpS6lYB7sfsbYXJ5kDIEAAtk46ssouq/l15m0kZjnJujvtV2uC/+//qxfm//1/Np49KKJDdj6Y9KGrY9TQZAcLNplbJvZ01CdnWg6XrSjwZAw650wPAAQIQJXJ58zUm9vQ2RhqXZ0VBymq4/O//aNfMb/3L//RYldkBXuID+jwuBSZ5k8172UIUdrW31Zo59j0JDwNAAECUO9kX2dug5AlWXez/Wor1/unf/qXze/+NDL/8U9+vvjXR1ohCKCr9nTR4FcmpqflYnUn99riV3qRlA8ACBBobiIaqBN9UuPXLBKmu5YXou1XW0ib7IDI6en/9t/8Tfnf81R8nNFjoaNjkNjQQYNfK+FD510ck0q2+YXFmN/J854AAAECfkxIdR9eOFcRMuto+52ZmkLa5t/+tWTwo9/fwwEABLyTceio76dzp+3+oWSbT8j1AOgnHEQIjdDA4YUibD5omEUX208EiBxemDhvuB/9/tBkBxcO6anQISd4cZBpg+KjD4cKlmVbm4tQ20N8APQXdkCgDcdgbOo9vHBqspW1LoZk1Vk+lNVb6IqdiGA/bejryF942PYiPj5seIvsUh+SaA6AAAFoY5IamnoPL+z0JFdzSBsHf0HIAr22CnIriA1Vm5afgbT97YZxeZ9wTwBAgEDbk1WdlWk6vaJfs7MVmw4e+AidHktGag/Dhr6S/AW7MV1EGrlmALCAHBBoFZ3A90y2MuaahYOu4RhdbLt5+pK8kImKLZeIqPmgTh2A707v2GSr7k2Ij5khf2HbuLuMjE8saADAF9gBAZ+cCBEKdcVtd7rUY83Vfo6IbweP+37VE7erQHhitXH8kNwyAECAgM+TV2TqO7xwps70rMPtV5eIEwEyYQUTPOrrstLeVJWrRJ3oGS1vPQZdpu02oWUAoAghWOAVemqwhGTVEd4gjsqthmt0tf1k8q+jXO9Y246QLPDByZV++Kkh8bEIE0V8VEIWLM5pBgBYhh0Q8NnJqLPSU6dX5Wos10upXmi7b9dZuGK5rx/qogiUfz6Rua+CRfgmACBAIFhHWkTIQQ0fH5uOJ0bWKOIIq4CuiOpVdDpnrCEBkqTt95wWAQAECIQ8qY1NPYcXJqbjsd01luvtvIADb/rwUPtw3SFX7PC5eV7fG3Y/AGAD5IBAEOhEtqdOr0vEsfnQ8byQusr1iqD5RF4I1OzMSj/70ID4kLFlD/HhhMRku0gAACthBwRCdEjqigGfps7HUcfbrq5yvRzKBnX01zNTX2nunEWiNP3XrWgkdwYAECCAI10eCcWSsKIEx85ewBlK9YKb/lln7teyvR9R4QoAAAEC0LYj3YvqNzWduYJDB74uLizDoYIAAAgQAK8caaHzYUU1VRaaa9tN6Z1g2R/Hpp5iE0USw6GCAAAIEABHjrTshJw4/uip6UFYUU3leinVCzZ98KIG+33UJ02280GYIAAAAgTAmRMTmaxcp0tHuhdhRTWV65U228fhg4b73TIcKggAgAABqN2hcZ3A2pvzAbTK2KlDEYfzB+v62kjFx7DGr+FQQQAABAhAY85NHWFFvUhcrSkRmFK9UOxjY1NvvgeHCgIAIEAAWnFyhupIRw4/tjcrqjVUGWM1GnLxcVXjV8TazxJaGwAAAQLQlsPjOqxIHJteVNKpocoYpXoRH3WJDw4VBABAgAB45fi4DivqTbnZGsr1UqoX8eEahC0AAAIEwFsn6My4DSvqTbnZGvJqpmnbHdErER87wqGCAAAIEADvnSHX1Xdik4Vk9SEvxHXZ1Jm2XULP7LS93Rr3CeeJ4VBBAAAECEBgjrTLwwtFfOz3xRlynFdDqd5u29kH477ULocKAgAgQACCdZAi4/bwwqO+5DbUkFdDKE33+ojYluszeRCrAAAIEIDgnSTXhxeKAJn0ZXXWcV4NpXq70y8OVNwb+gYAACBAANY7TK6SrHuV2+C4XG9iiO3vgqh3FXrFoYIAAB3iCU0AcI86OHsmSyrfFQlL+qCOeR/aLta2mzr4OHFab7VyEoTJiSPxsehXiA8AgO7ADgjAGhwnWU/6dDia452kqelROFtHnr889087Pn8OFQQAQIAA9NKRcplk3av4dcfleinVG9azPzO75QRxqCAAAAIEAIfKuEmy7p1j5XAniTyAcJ657H4MK/46ldAAABAgAKBOlavDC3vnSDveScJB9ftZV618lRgKDwAA9AKS0AFKoo6RJFnvGpO+CE3SXZXetF36krY7d/Bxp2nb3WqIF/jHqwq/Iza1h/gAAOgH7IAAVMDh4YWxyVZ95z1rOxflehPDirmPz9cm/Eqe4RGHCgIA9At2QAAqoA7Tc5Mllu+COOMfNESpT23nolzvUNtuTI/0RnyMLMTHouQ14gMAoH+wAwKwu9PlouSs7IBIqdkpbVeJqaFUrw/Pc6zPcxtHfevrAABwDzsgADvi6PBCccCvUgfuqodt99zsfvCjOL6SFzKkR7bKixJCew/xAQDQb9gBAXCIo5KzktOw37fVfEdtR6nedp/hrVl/7stc+zU5OwAAPYcdEACH6KnN+yoiqiJx9L2r8uSo7fIKYxf0Rq9AfAAAwBfYAQGoCUenQe/3Ma/B0cGPselZhTEPntv3iA8AANgGOyAANaGH5UluSFLxI3q5E1Jou/0d2k6I0tenPlUY85QjxAcAACBAAJpzpHc9vDA/QbyPbReb3cv1inijVG97nJOPAwAAyxCCBdAQOx5eONEcib62nYtyvdO0DY/oibU+p2II1ixt7z1aBQAAlmEHBKAhdjy88LTPJWYdlesd963McQskRdFMcwAAAAIEoH1Hep6+DtM/yssmOVpW/k9pu+t9dWyrJpaPNcEd6hUgU044BwAABAiAX850lRX9MQftOSnXe6ohXeCeXBie0xQAAIAAAfDPka6yon9Ky2XJ/ZpfUNXRvULM1cJHEdXps0loCgAAQIAA+OtMy4q+ONNlVvRZuX/YdmemWrleCWkjH8Q9cfp6RzMAAAACBMB/RzopuaI/IHzoUdvFplq53oi2dI6IaMruAgDARijDC+AZenCelOsdrnnLZep0U2FoddvZlusV4feclgMAAGgOdkAAPKNweOG6lWRO9l7fdrbJ/UN2QQAAABAgADjS9+V6pyv+OaKFtradTXL/a1oNAAAAAQIAmTN9ZOxzG8BYles9+PXfOBzQYgAAAAgQALgXITEtUantypbrjWgtAAAABAgA3GN7cjo8FCJnJtsNWdeG5NUAAAAgQACg4ECL43xES+zUhvEGEfKCFgIAAECAAMBDB1oqPMW0xE5tOFsjQsgBAQAAQIAAwAremnInpoO9CAEAAAAECAAsOc+yC/KelnAiQghpAwAAQIAAQAnn+YxWcCbmbmgJAAAABAgAQFNMaAIAAAAECABAI/zOP75OTHbQY0JrAAAAIEAAAJpAEvs/0gwAAAAAANAIv/4bh5ThBQAAAAAAAAAAAAAAAAAAAAAAAAAAAN/5iiZoiDfXEmM+2vq+bw5jGgvAe3sepv8dbnnXPLVnTq0HAMC3AgRIbUYQqUMirxfpa1D4/6rM01fuwMjP79JXjGMD0Ii4iPRvXurPkdp1VWZq00n6+vzl/5kYAQA2iYt87HU1Fhd9qzv9iW+FAAnCKEbqnLzQn8OWrmSmr48L48FwAKouHkQ6ue06se1qy3eLn9gyAPTXt8rHYnwrBAgqPP3vgRrFQUsOSllVH6sTc5MaTcLDA3hkz0O141fmfpfDN5IlW57z4ACgo75VPhb77lu9V0GCb4UAqd04xmoYB4HewUyN5q33BvPm+rZDPeduxd/FXwYyVlPaEh1iz69Ne6tqu3Cjk1/3xEi26nnh2VW9S9t5GoDzdu3p1cmcc1PyPuTZjwz0ox8/FB0h+1bvDAu9CJAaHJVjdVa6dDjZzGQnPvvpwLy5/r6HvS0uCJZk8SIfoI5FBBEdUUfuaK5i5G1nhGwWAufbAsR52r5nnrfblc5T/s013xzuWdzHbYfs09CPN/pWp8bvKJLu+VYe8zVN8GASPA5YkW9DVphkwrpI7/VGByaUe7tESz+lH+YDWp4PwHavvS0P1DETex527O7yexun9xmrHSNa+zlfjT29uiMekDfEnvTV0w6LzKJvNTUhRJwgQLwayLtsHJscmNxYCAnyb0AbfXEw3lwnhnyAssLjRIXHoAd3HC1eCJE+9vMrT6/unPnEK+Yt9tM++lYni1fmW7HIu4X+hmDdbweO6QamfWPpZwhWVbqbD1C9/4zVnoc9bgURIJPgHEBCsGzb60z7um/YhV7d3w8hWHXxzeFXLfTPoQpknqkPvpXHPOmpsyIq9QPi4wvSDp8WyYDZ6hr4zYEO8J8WceCZA9dX4TFSB+aq5+LD6IT/ATvueH/3U3wIhF75RdJC/zxbzEuIj2Xf6owxue8CRJT5m2sRHlJ1g87wmBM1lhOaIgjycLrbRb/OdgH6ZM9nupDAZPfYjj/0Wph2F0KvwD8Bki0EffBYHLfNqfpWBzRFHwVI5pyJgVDub7tTe7FYVc62UiEMskS4N9efOi9EmOzKMFRhym5Id/r9iafz18z7imH95K7BfolvVc63usa36psAyeqMXxl2PWyITLaKym5IeI5nLkSiji4k3DLZleZEhQgTXtj9fuip4JYctEMekJfMG+iXWfUnqOJbjREg3R60B+nrWidhqKbYLxZtyCpqiELkVp/dsCP2zEJCNUaGkKzQ8TVsmARbf6kvJC7zrcij3c23utIczt7OZ90VINlDlZVSYu5250AdGFadw312J0HbcpZozkLCbhPeLatuQfb/A0/nMTmj6JIH5C1JTf0x963wB3ZnrONyL9uymwIEA6mDoWHbMGTnM8ydrHtbjniMTrjSnSQIp//7mHgu4T1UvfKZOnam8K3qYKQipHeL5d0TIBgIDgysI6ydLGy5Lk40dhv859QQegX2uA+/YjyukzxBvVe7/F3cAbnAQHBgYC1DE0IoDpNd3YyxYe8FeGT8DDsk9Mp/6khAv2Y8bsB/7dG43C0Bkp0LMKYPN+bAkJweJnkC3NhTO0Z8NGfD7Gb6C6FXUBW3JXgzpziiWRsbl3shQrojQLLVIs4FaJYhTRC4g+ObCEF8NM0JeV1ezmdnno6vhF6FwdxhXxwbFnabphfzXzcESOa0XNNnGx/gjtLJaE5TIEKcXg/io40+QLVAf+Yz6f8+LqYRehUOM0d9UUQwu6TN+1b7CJCQJlDOBmiaw3QymtEMOKAOHS+Z6HCE2+sDCD8/8NHhI/QqLBJ8q4DFR08WdsMXIFnoFU5Ls8jOR0wz4IA6tGOxYc75aI88Lwhno935TGwg8vDKJoReBYSLZ5XtjEc0ZuO+VW8WdruwA0Ill2a5TA1kSjPggDp0uobYsReMeA6tig+xPR9Dr24Y84Ni1uG+2GVE5N/06YbDFiCZQh/SbxtjmhrIhGbotAPaxqRzbdjm94UDktJbw8dwF0KvwsNF+M4JvlXjvlXv8qtC3wFBoTfHbKHQoeucaFhjU4sIZ4akc9+40F0paM4ODoyfocQUGgmPux37oojgY5qxMaS4Qy9FfrgChN2PJulVYhQ0FIbjb7WfvjMwhGI1OZcNjJ+J5zd9Cwnp0Hy9CweGHemmkIXdw77e/NcBX/vrAK850dfdF+W7evLPV4Rf6P9HiA9okOFiZ+Kbw7OavyfU8o6JThwf1T5mj9ovez1TWw5xhydarMrjgDbBqfFvMY3Qq7Cd2l37Y8hjclnfatjy2Nz7owzCFCBZeEAU0GDwzmSrSUnJ37lZcc+5I/Oy4RWKI8rt9pLjtM9d1jY4hldhpYod5/eaLyK8NmFV7JOiBDGLD7XOZdIvfKz+RuhVHwVI5mcMA7nPWMfk2IFvFalvFTXoW+333bcKdQfkIBDjOHdWrjbrqPKaLiaHzGhyh6auAWPCCmhvGahjdFaD0xVShZXd7Thz5G4Wr2zxZGyyGOtBb/sA5BB6BW7ZTTiGEFlSl291WVgUeKXjdF1jNAu7AQsQ341kUntFg3ujmWgCY24wrphy6m2l00gj/SlbvCGtJq2zszqczxAqrCSmjvNuspW6s9RmZSHhyvi/C3S8uFbOgHCPnwUYCL3KOA/0une1U98Xd5vwrWIVOblv5XrnmqMMlK8CHLRFkX7r8RUetda5stXVYwfKXbY09xu+9u+9e5LfHH7lqL/K4PXSsUAMsz9n7fHJ+L36f2OaCkHJDp7zPRdmWmuVlmzF8dY7B7TOHKhsrP7goR0cNr778eb61jsh7mLsD8+3GurY7CN5LuqsxbY5dTCHT/ta8WoVIVbBijy+tkmrylZWKbNzOp6bfDvRnl5XZajhmcwXfSIbdH5kspW1kGKrXzn+vBPPxYc8q8PG4t+z1bxDz/vEmLK8zvHxzA9Cr/qN775VeyFLmW91pL5VVR+Poww6IEB8rSgTexOylDm9uRCxmVB6X5WhgedytqNAbJoDZ86n//Xl21mdypw+30U/5ZJd4WcBBkKv4KWn13XjTcjSQyESW9oX1UQ7IEB8NRL/YkYzYzk0WS5DUuI39kmMalQg7pswdkNcxb/6vPtx0+rWeBZ37LMDOFYBCbuLcB9D7g5xjnrPEN/KyrfaN9nC0TbfCvHRIQHio5EkzpNV3Ts3e2bzqjtVGdp5LiGIEFei39fiEYkXzn+2yjf1uB+cYLQ742Po1aXX8xc0ReThNc289kuy3Wt8KwRIy0biv7NbXHVPVkxAU8yhlecyC0CE7L4DkoWdDD29P5/CDidm90o2dfEag93JBiLjX5Uh6WvnPJze901fdzf9F8b3vtWqXD6OMuiMAPE3EfJjQA5vrIo9N4qpGg+0K0Imntte1FHnderV6m8mhHztC0MtSwnVHLwrxDd4iq+5td8FNI+LT1XMDeEog04JkLDPVPBNsR+aLOwE8eHHM5kav1d7qguQbOEg8vCexPHyMb74xuO+wC5INU49nL8IvQLfCat/Zr7Vvgp7ijp0TICAa6eX1S+f8HnAerHD7449vSefD9jzNSzmgGR0awEuq8u+5c8khtAruMdXmx4G2ZqEtCNAAAIbtMQp8DVedJeJwNdV87ce94XY+JtbRhiWHYRege/4GoI15NEgQGAzL2kCcMS7Tk1Q2eqvj5PIjce7H74LJMKwyvf/Ew+dO0KvIBRe0AQIENhMRFgCOCGL//dzZbJaEQhfndV3AfQGX3fDGO/K24tvBziK6Cb0CsLxrQABAluhRj64Ivb0uqoIEB/DdeZBlEbMQmR8vU7CsLbj45kfhF7B6jHRTwZawh0QILCBY4/LBENY+FrW2c6ZyuzBR5sIqS77e0+v6xVmurHvi0CLPLsqQq9gHT6fZXbBjisCBLY7Z9cYCnR4MrCNZfd1lfx9QH3B3zAsWCc+fDzzY8Z5TxCwb3WLb4UAwTHb7qDdshMCO9KVEAlfizPEwbRgFi7j47g30AID8JgL42PoFUC4jBAhCBAfJuMQDOUDJwbDDv087sidRB5e0yzAGPiY5xsIb66lTcaeXdV52udnPBzYOC6G4Vt9UhsDBEgrJAFcYx6Odc1uCPTUERsZPw+3ClHc3Xl6XZQff9jnfQ29OuPhwEbCWZTJw7Gu2A1BgCBANnOgiv0KIQI9I8KZd+hE8oxDQCoh+jbOE3oFZYkDutax+lZnCBEECA5EOWO5Im4aeoKvB0iFF4qSHZjo4wrlgIUVJRvXfTvzg9ArsCEJ7HoHanMs8iJAcCBKChHJD7mltjV0HD+Ftv+nn4c27rGgknHhXX8h9ArsuAv0ugfmfpEX3woBUitxB9o9MhIr/Ob6W3ZFAAHC2BGwc8DY9eb6xPgXjkboFdiL1m75Vhf4VggQt/hblnIX5S67Ink845Bu2XuHZhj49UeeXlkScKv6miT6Alsl9Ao6QNZnko7cjfhWJwXf6gTfCgHiiriDzyKfyMRYPmAwvWbI9dfC54DbdMaz9hLfzvwg9ArwrR6PURf4Vv7xdaDX/U7VbVcZ6Uu2EGd6vzcBx69DN5y6WU+u30d8tf3+hjhkZz35dt4ToVewC++Nf+fY4Ft1lDB3QLKtwr5sMY+W1DtxjQiQtigbBvQy8Ov3cczzd4Ls43jk55kfE0KvYMdx5sZ0JwzL1rdiZ6Rhvg742t+Z/q2+5er9BPXeaUJ34H2tyx66c5Z4Kk77WIf/1LP7jtN54JKhExz5Vqc9u2d2RlrgScDXPjUhr2i6Ve+UnusWkZdXVX511dcSvKGPF75Ohv1aCMqKLPgUAiz9mtArcOlb9Zmib3WNb1Uf4e6AiDPx5vptD5X6Ooc1WoRnZYPHW5R7sM7NgadXRn+CdfRtB8S3Mz/OGe+dj8NnAfhAZzV9bpLev/gRON5ZjtcBvhUCZBWy5Xxs+hkCsM4RODFZiFasE1NMswTFq6AFiL8leLtgBzPj5+7Ys545piOv+jWhV3UQwsJmnSLpHAGy1re6USGCb7UjT4K++iyk4i2PcSXiqNxqDWwGkjCcm4HHg/4dD6h1vvP0uoY9sc+hZ44poVdQl2+VqAiBxxyob0Xoe68FSGYosgpA5Y/NzsEVQiQIfC4tHXoJXoBd8a3qFaFXUCeys0b/Wk+Eb9V3AZIx4VFaCZEDmsMz/DxRuUsChIm03rGl6/Z5YvwKfyP0CuolizBhh628b/XB4xBkBEiNhhIbtgttjOVatw85T8Qfrj2+tqQDK62fO9BHYgRIK+JjYAi9gn6KEBlzELrlEH8qD80a0hx9ESCZoZyZbiSaNoUo9fxgQ5L423VwrozfpUyxK+gzYp8+jZFU4oEmkcVdwtztfKtPi4IV+FY9ESAZh4ZQC1tOVIhENEVr4mPs+VW+t3jvCx4qdMg+szKcfvGSBwONkYViiW81pzGsOMW36pMAwVCqMjTZ1iG7Ic05NsPFVq3/4mOe2tWNxfvpP9AVG5W+fOHhlUUkvULDvlWS/ncf36qyb3VGU3RdgGSGMsNQKnOixkJuSL2OjQxGH4yvJ54/5IYHBiX6dNTBuxobf/NbWCwCfKtwONUk9SFN0WUBgqHsSp5IRaUstw7aUGNCP5lsazYU5+EdDw96is/i27fEeECEwHbfipCszguQh4ZC8lS1ye2abf6dBceBhrXJbkcuPIYB3UXSodNemTDBdg5JjN8VgE5YUQVESHC+FQcYKl933lDeXO+brMQpqtMeqW39Mm3HfpZ8zHI0bBmZ7uRBdKm0NQsRUNUGxh7b9JU6gwBN+1bPF8603xUcffatpB2nfW6EJz0wFEmi3TecE1KVsVZq6iNRhVdXxIesbpH/AX13tMQO3no9RhEuC+35VnuGc0J2ESFjBEg/jOXMZCtFCf2+kgi5oBl6xVt1vgD67mideT5vkJAObdrHxBCShQhBgGw1lDj9L4q9GifELfaGBBsBeIDPO+hDk1UwBGjTt5KQrCmNgQhBgKw3lHlBsRMXbm8oxHt2n0kHdz/ot7DLvCGOVezxFR6TkA4e+FZHhkiTKlz00bd60mNjiTV+UQyGrcPyXLPd32liy4MHQ4E+C7ty7nn/JkwWfPGtZDdkgm9lZb9XffOtnmAsi5Wt5zq5YCzbGZqs8gp0j7kKcoAqfaf7jpXfhRkOOGMAPLKXS3wrK2QHpFdn+yBAMkOZa6IhxsJE12eO9OwDANsxtC/hrBPPr4/FIcC3CpeTPoViIUA2GwvOGBNdX5g6Cr1igoEuzxEyJ/hcoEEOQD3jQQFCJFh6E0qJANlkLFkco4SkkKy+eqIb0wydIHZ42ORHmhM6ju8O1DF5euC5b/Uj9a0SGuURUV8iTBAg2w1mqsnq8pqi3B9wShMEj4jrQ5oBwMKJ8vtwQhLSIRTfShZ59w3le3vpWyFAyhvLTFeJ2RW5h12Q8MXHfk8OHHzWgXuIPO5HfUPCsBKPr29Mnh4E4lvlO/CyKzLBt9Kxvgf2iwCxN5Z5YVeEXBFjXtMpEB8FfLWFIY+8Nvq3K5zZzbnnV8kuCITmW10WIk58F/n4VjvyNb1+J4MR4zhbvLLKBdJhDnrm7ESLA7ConoT48FuAALge/6fp2Hds/D3kcrTYoc5KzYMdMU3Qqm3NdJ6a9Ni3kl3MSZcjFBAg9RlMpEbTh5JqMjBc0gmCYOow4TwkupCU+9TT67rrsT1JyMitx9cnJyzf9CTM0uV8vk8jeC1Goh75Vp1dQCAEqy6Dud9KzE8E7XJcI2FYYXDUgPjwtZ93YbIa0YW9G+tj4/dquQhvioVAl3yrSY98q1ddfpwIkPoNJumBGBlR9tFrpL/tNRKKwUprX/tXv4W93/TqcDPotW+VdOwuDxAgUIfB5ElWXXHYIh6wl5wv+luzJ1X7OQlIrlLY+Hr9/RadWf7b1POrJCEd+uBbPTddOzKhw9WwECDtGUy+lZgfyBMHfkcveaheIf3puZ4+2zSJp22CAKkHymZmq68+OzwRJdOhR77VUcG3Cn18QoBArQYz1aS3kA/kYYvfDxKTVbjab7Eyma8DfrgCxOfdG8LuQjicUDglVBZ66FvtqW8VB3oXnV3cRYD4ZSz5gTx7ARpLxANsFXH6jxZb0FlibJt8hwDpzbXHmN4XfD+3QPrQCY8Jeupb7QcqRIZdfSwIED+NZabGcmhCimMMP8Y+RG5MtuOx51G9f18H+BcIEOckmOCXcTuEwwlPGacBIeJ9yCQCBFo3FnEuZTdkhqFAgZkOoLLbcejBjseq66N/9uPaP2KOD8bsaQDj9RUPCnpup7JbuR+Mb9XRRHQEiP+GkgRkKOSBNCM69rTiR+Jpn5WVpTn90ykvPe6X8JCJ59cXdbmyDkDJeWoWlAhBgECLDp0YSuL5lZLg6I7YZDHlEob3I+9FRyiOabjnIQw9HZtiTHVlm/jeLuyCANz7Vr6HY3VyweBremBAhvLmWhLUb2mMzgkN4U4F5qzhMzvq4s7TQXNkQlvxyioX+ShAWDlcj4zVn7wWtG+uz1oq0w3go291TWMgQGC9ocSpoUheiK+nY3atXJzLhNL5A4et+yvHcn+nnvbRaWBtGXn8jGH1WJ2kY7X0s7HHV3m8uMZwdlUB6rLXm9QWYkM1TwQIbOSdxwKka4PSGY1QGV9Xx0OcYHwNG7ujm29komO1r6Gpcl1yQvohjwpg4Vv5Oj8862KDkwMSolIPqTQv9LWfzj0VIcMAy5C+8vS6Yjr6Vhvw/XDCAxLSARbceHxtwy42OAIkTIi9hhDw1UENx+HK8j983AGZcQJ6KaSQhO/tdMFjAhYMvF006ywIkDAh9AHop9V5FVAb+hpuGdO9Szs1vpflHaVClxPSARAgCBAA6ITz5euW9oHuLISAr4Ud3tHBS9vB1PhfQv00IJsAqIvPNAECBAC6gb8ixHcyh9DH65x3pFR0kxx5fn15QjoA+EeCAAHY5pgAPOS9p9d1HEDb+VpB6YZubUkYhxOOAz6oE6DLdHJnptsC5M21DKis6jTHR5oAAnFWRwE4W68RlZ1iEsA1Ml9CWd+KvCFAgKwxEFk9vEpfJ+mfbzsW3/qMrgtBkCXh+ipC/N0FyUqjRh5eWeJxbo/vtiBha1PPrzJaOJcAm8RH5ltdpH++7phv5WvOXSejS5501EBGaiD3g6oxHzpU79zXlVviwmEVvq6Y+xxycurpdSE+duPchFCWl4R0WO1bRUu+lSz03nYodA/fCgGys/i4NY9jp4dqKGeB39/QYyMhBwQek1UB8rVvXHho4zLJR56211s69E62kATQhgOPBTC061tdr3HaPwQfkpXdn6/CO0GA+N+BBmogmzqRlBv8ELBiH3s8ucaM0rCGqafXFWm4pk9cedpWsTrQsBshHE54ootdAJsWdotcaLh7qP3G35Dcjo67TzpkIAM1kDKdP1fsZwHeo69GQvgVbMLnVd8rbybNrGjGkGfYYcI4nNBnIQzN+x1XptzuQBSobyVj7tjTq4u72rW6tANya+xDk2Q35JOHK6CbJgRftwgRILDJ6UqMv/kD2c5p23Hv2TjkaxgDyedu7WFq/A+riAKaG6E+8WHrWw0KvlUUyJ36XP2ts77Vk44YyZWpnhcxVOfj1mtjySpP+DwZ3DFawxZ8XkEftToJPS6c4RvndF/nHAVwjSSk95vrHX2rW+/DsrLcFXwrBEhl8TF28ElRwVgiz+5xbPzfDo8Zq2Ej/h/GNtbxpA3xsS2+uk0SXbGHftlD7kRy3kMfycZCF76QfManxef5JkQy38rvs286vPP8JHADOTHu4/aKQuTAk3v0XXzMSE6Fkvi+kj7WIhWDhux77Ln4COGZhUwIuSDHJKT3Uny49q3GKkT8WOTN8lR89606Hfb6dcAGUrdyjUwWAyuO9TsjVXyadLKzAd/VCkTdvGPEhlLIqu+b69jzfj3SifKottWn+8RO32Ps2f2o1x5maV+YGp+rG2biWObawx454FFH+ldc0beqsz8Wfau3Cye7Wd8qD7cN4Rm/77KZfR3o4HDQoHIVIXBqsqSqmTrbsZ5qW5fwOPV8QuqVSgfnnAcw+OeJ6fHiel2VmM6Eh+xqHhu/dz2Kzwrqb+MDz/vDwcIp70+p9duO3MdXFcRHk77VhcnyjHLfqj4xkgmP44B8q7lhB8Q78dFmsubI5AlZmXoXo7kzWQhSvOM9iUP22vh7yOB68UH4FdiQ7YJMA5kIIpOt1sWFCXJewcZz+/bd0SwSs/vRiD0kaf+QlWDfD/+Tefc5D6yjPD7lvA3f6kJ9KxlvP+JbHXb6cOevAzMQn5I1h/o60GuT/yaF1+ctv/9C7yMKvA9xNgBUYRKYMx7p60pX62Zq4/GGCVXu7WXhzyE+I2gGOZzQ912x4SJu/pvDMx5X58THulPO2/KtxoVrw7dCgLRuIGVOOfdFlPSFmNPPoRKysvPmWkJPLgK8+vudUP9Xras7xHWFmcI6e5gY/5NiJSH9susrsz0UH74Xwuijb9X58fdJIAZic8o5NAfx4bCL03VpKN/sIwm23Yo9TI3/hxMOAl00gPW+lc8HHONbIUBap8op51C/Qsd5hF2Rw9hYTfXtmbDC3RYhhL2NO1MlCvGBb+UfN33xrZ4EYCRXGAgTJXSUrIABfckfzllYaNUepOpNCO3PLkj47HLKOeBbdVyA1HMYDuwO8eHg0umaGjlnB9omJsHYExHoPyMt2Qoh4u6Uc3Bt+z2qKvrEYwOp45Rz2J3EEB8O7pFVH0Rte0jI1SHN4IUgjwMR5BcaxgPhiQ98K/+Y9W0ByOcdkNf0Ry85JD4canC6cgeYvtWO+NjHrr0ihEUeER+nPKqgxMfQsPPh6xh81Leb9lmA7BtWRH1jQugV1ChCErV7HGHsGlsIQ4ScaBlXCKdf7eFbMQYjQDYbylydkRv6phdMtWwqQJ12PzMkpTfJEaede8tlIGKchPSwxtjct0KE+GLnPR2Dn3hvKN8cHhoSVNtGYhOPaAZoyO6npofb0YgPWOEohrALEpGQHmDf+uZwD9+qdWRht7cLbk8CMZYjHJIWxUe2WgKACEF8QLN2ILsgSQBXekpCepD9S8ZYdpzb8q16vrD7JCBDkclyL5DBuFvig+RUQIQgPqAtQnAQh0byQSBUkUvuXRu+Vc95EpihzFSEkBdSPzHiAzwRIUyObsgqjSE+QrOBUA4nPNUqSxBeH5P+9TyQfhY600X4G75VYAIkM5Q8L2SCU1KrgSA+wKfJUURIQmNUJtEFBRZvwiSUs5eueFTBjrPzxbzPOV91ckk+bcgC5N5YZNtwD8XunCMMBDy09xn2XpmbRdtRajd0ET4N4EolIT3igQXd184MpXpdM1ffinybTgiQzFASVexHht2QXZmpkzKlKcBTe2eFzp7JYseY3cwuwC4INDXWzrRKFpEmbnyrfXyrrgmQe2ORByvxi5xTUY1LNRBWPCAEez8zrNCVXVBgTOxOv08CESFD8+b6jAfWiT53qb4VznPVRYMs34O5qrMCJDOUuW5vYSz2TsqEFVIIzN7zFTp2Qx4idjxh0ussoRxOeExCeqd8qyNDCKwNsfpWCPFeCJB7Y0kKxkLC5WoSk8Uj4qRA6PYuA/xzbH3BdNEW7Hp02xkMQ3TLmSCnPLBO9b2ZhsDuI0Q2+laHWsQH36p3AuShsRwadkRWCY/nxCNCxxYdDns8McYqPI7YyexFfw/lcMIxCemd7H+xChFOUl/tW7EYVpKve+GcSMd4cy3hWXJQ0muTHZrUN+M4R3RA5ydGccYzp0dWX7vu/Ig9v2WlrZfILkgIyd4X6qhC98bbmfpW5wux2U/faqZjML5VBb7q5V1nDooYy4HJtoq77KC8U8fM92fyvYcD7FcGQrbzoQqRLtn5fDHhZWf1JB0aj2+9c/B9j99+c30biMiebAwLDOc+QhQJXzXcJ2WsfaWCpKvIGHxjWPzZma97apTikMeq3nOD6YqTIobxfvEzrHCMGHMEx3aemKxEt9j5uGDnodr1u45u7889tP8QxF0oBRhems0VKnHiujPm3izGqizi5ECfPb4VrIQV3ofqfVQwmiiQq0508r7DMAC22vggkIkxt+v3i5/YNQCEO+5G6lOF6FsxBiNAWjOakRrNUP/cNmIQsmL0UY0i4UEBVLbxUWFiHJn2YpjzyS63a1aFAaDrguRFy+MuvhUCJDjDGajRPC2IksixIRg1hu/0/+c4JQC123du2yO185f6L/n/78Lc3Ieb3H35/xBytAAAmvOtnqkoGRi3C7+rfKsEsYEA6Zoh2YETAtBN+8a2AQDwrQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAYAt/gSYIlGhyYYb//X9lkv911uI1jNJr+Jn0Gua009brGKfX8Tq9jt+k89IntlzfML2+YXp9f9CjZzJI7/m/S+85qenzo/Tz5+nn/ycP7jVaPF9frqcPzx/q7s/0ZbDm64A7/TD970H6GqQvcYBvTHzRp8Erqm0wecg8bdd1jtpF+rpLX2e9ayd7XjR2LdFE7GKk/zdLn98NQ52XfWId4/T1Mn3tl3bejBmutNNsnJR/iz2/Z+mvt+nrq5o+/1bbs712kAUbY651vpov7jmaHDb2bPK+sBoZJ+Ydfv5QH/a2xRwFwQoQWU3OnF/ptJ/T17P09SH9+2nakScr3pvUOshnA/s4/Y7mHPH4Yq/GwaTYVgO9v7eN3p//7WR7HZMGHZxEhaHwOv37q/TnUa8G+WgifXW6clHClz7h1nk7fSRYsv5wu3j24AOnJlsomyyJxyaF7WsdH5aZLBxB8GX8inThYNqx+xromCS815/Hi11pYw43LHYCAsSLDizOsDhUew86azQ5X/y9TLoPO/FrdcbiGq9qqJPLWSd6RXyxv2IwvE5/miBFSD8mrKEO7JNHk1b2/G7Tn3s9GuBP1eaTnvaHQaE/sLroB4OC05WPtU3vOrxjDA/Dgk22Czrt2H1dmGxB+HBpvDpYCBEWSxAgnnOwcCyWHalsID/cccIeqXEkS47dUL9jNxFzH960ebv78Vb5SAejd6WdifvPmO/sdMp9R5OJDh5nFe43KR0el/9O2ba2ff/mZ7+5re7fVxSe8lw+O5vUq99Pvro6XfP8zvX57W+9t03fna2qD6yeqdtn4M4eXdrO/e9sbpdmrj8XH+dbV1DLXnedz971+Fm81jJtbGPXdbeB7eevm7fct/t8acHP7ntt+ll7Y8+6uX/bfF1u7Fx9L+5D36qMMVXGgWrj18FKPy3za24ataMyz83m2Zb7Tnd+WQcIL94yC6k6TR/e8y3vO1OnbJkffTH47D2Zg5y9N1msUMUXlzroXpn7eN1cCDxcYY4m36/4jsulbfbHsb+rQpqyzn79ZSDIOvNQV0G+M8WQkmgiDsbdms+40hWUmX7GwJTd3pT7iS++WjMJ3T74t/XXcKUDzawwoSd6DfOl994u2iK7xvwZDLWd9h29f9U1fr/oC9lnHOjnjNSJP1px/+K8jwv3FOlz+ayCOC7RH1+u2F2yu5/1g+S3ZnlXsOx77m0l3tDPR9qvBoVrfPhM17f1mQ7gZ2vu/eXSM5g96ivl7fHWPM7xmD0Iu9psO8v2t9p2suvJBd21uc9Fi0wW7jZd8f7t17+pr2x2EE+/vD+afNB7Plrz3vLXvXr8Wm3P0eSTWd5xycbrVTvWco/PvlzjqvHFdvx8+F5T6Kfneg37j+y0rF0/7htD/Z2jEmJo9Vz0cCwt18bb5q3t17F9F/v+82/MfUjnUNvjSJ/pceFZnK/87myMfV4YN/J+drkiVNrm+a8aezaPgdHkW31/XBgDzs199ELywB6zfhEV7nF1rs59OPisYNOPw12zNn26WES8b9N8ft//cs15OzzmcOvio90Ys8s4UM62Vl/jp1ILIw/70Cq7zRdY4hXXuHmeKj/nlX226/rn+YbxI59bzjsXZmdBiDsgN4tOkTm5k7WDfzbInq11Nu55qa+9pc+aacdPloz22hS3RWXA3Dx4Ds1yaEy+QhlNkqXOd63qeX/JCI4t4tbzwe15YXCOCgNSE7x95Pxkz2G8mHwec6rtvbfkzJ6aLDZ51/ev49Zku0rPC8/lU/rz/ZITdaYDc7FN80Fn38Fq3K73k6/QrBeY8rnRZFYQpsV7e6X3ljxaQXu8on75oG/uvnqX2/Fk6bsuzMPt+LL2uL9x4ipjO4/tLw9fS1a0+/XSRBPp+28qjSe7L9BcrRUfVa77YSjXdOl7bhd9ttDLvoj4h+Pr436X7+iWW5ktN37eX+u9OMn+7mKDo13Wrm+1XfeX2mC5n26bi1Y5TTZtvG3ecsXrB59/PzbOdfV7r9BeH7TfJGvG2MOCgz3SZ/exlONVtm2ya7zR615eLDjQFeflseBCn+nzB/YYTV6qz5CPSSc6Tj1f8bkXSwIiv7/ZivbIE6/3C2Pt2ReBfr/K/pX1IkS1MabKOFDOttbzTv0393m5ZeepcnOezbO91na5XGr35b42f7Bwnn1n1OcdkCfBXXHWkfbVeD4tBqKss1Tuttph54++Z3kAyQxmsKJzbeLYLIfGZN91rv9WNJ5I/774ndM1HXrdCsjokTCT697dSY5M2STF1Y7wnRr9KuYLh+nhM7gzD8Midnn/Oh6uGmafN1vxOa90gJkv3eONiqpd2fV+RqZcjtNcV12Kfe5Y+0tSuLflyeFEJ+rLlX1zN6YrbGPyqF3d2eM628mcg2XHPbu2G7N6N9U8cijv/zxq9PrvnbLRFvFhd935KuHys86+Y6ACrdhnX64cXx//fdk+W278zBirgDxb0Z9WUc6us74xWNGuWT/dPZHcpo03z1vbebbobw9fwxXvGzxYNc5+xo/6V9ZeiVlfXWvyYD7I/vxWhYLrtnmnTv6q53yzdtx9bAOfl77vZs39na65v+mKvlls02SFaHfjG9mPMWXHAVvb2iTG36oj/2Eh7lb3vypsn6fKz3k2z3b4qH9lPle89J7l/K+kz7sfYQqQvCNkKzCHX1ZRZWuvmhBJai6DGJn7ikTFe7gxj+OOzRqhMC85SL3SydrdipgMDvfblXVVcrqr+f1re1LJ9w3N6mRmCYt70cL9r5rYqvbNeYn+/8qUWa2uxncrbCMuLbrd8dKsj0FeLwb9L29rdrzu6NHE+dB+Xiz9f7S0wjfXsa7493muT1Ly+8uMn3k/fb9m0WoXu365cqwoOuW7zxFl23jXeSvSsbz4WmVnq3ITPq4Zq5Itix6r7ily3jZZnxho/ypysGb8ult538vPelU/vc8NiFcubK3uE22XOt5lHLC1rW0i5Ef6TESI5gvJuwr5MvPU9jnP/tkmGxaoiu85brjqnfd8HfTVZ50oT5AW9Svbp7ZhF8mGjjhWA9nFERptXIHIq3bJS7a3RUQ9DP/Jd0bKhuLs7pw/zGtJ1BCfWySSDwsT27CCw+9dT9PBLW7QMW+CkSlXJars++rFjT1WsZ3EuFilrPf6jY4Rt4vJvNwuyK595LMp7mzI+CChFTLWZWNwVLCZWaFCYWQxFpQbP+8Fxdsa7Dprg9XXsMlZcd/G5Zz+TYRWBcu2bR6GYd2HX81quK6szz1ewR8ZV7sa/owxtra1zXcT4XK5eN3no2Shj/XOZ2XfY/Ns5ZqvNM/oxmThe9MVY7P4RN9qqKDMNVPvBCkCpHJnlhjbZybbHosdGHKehHa+FPf7fYVPe21Whx/FSytERyaLjxzqADrU+5k2WjFhVS5L+XaTa/6gg9VyrOvLQHtY7tjlKyADcx9CMPVEIJ2WeN/ANJsL5HJidWmP3bz+LA7+0GQx+Xctbe8XhcdLc79qemfuwzhfWC6UlB0/bfu3jV0vL6bkzE1fSz37yXt1ZvMFu007my443WAHXRpj6ps7siqNMm59WnGMQpuUe7aZj7NfOBxbzt6S373PfcrD1bJqlAfaLz8tFs9JQu8Mn836WFRbTox9EqtZM0GdlyyfG+tk9kIn3LnJYpTLdlD53actP4OxybaazzrTq7KV3djcV6rKJ7ojT1Yw7pPkNlfByqq5POwvr0r2q7a3jl3ZYxXbGThwMuu+/mJf3VcRMnMwmW969k9XtEsx1ysqOIKxLqZc6t+XXU21GT/tdlfK2/XcLB8g6L7v2bRxn7BrG+knWThPPhauLvu6O3n/OPRoFbvOMcZ257LKuGV2nGfKzFNl5rxqzzYTIvmuzpWOKYePFomyxY3pYpEoE8u9FSBPOnY/T52o9DyG1I0hx6b8yn/uvB8tVjDksB47dZyvMraJ7eqm/2T9YVR4LvuLRDdfJp77Qe14y+QUr0yA3B6XatOHV/Gskv0VhZU7e9xkO+tyyF7uNPE2c/3F/pCVh81W93ddkIk3TNjRCluPF39/n/8xL9x7/vcDC2Fk0/cSq75W3q7rHldt2zh0Rqb8qetV2iYLw7q3u1lNNjY3vlQxqn+MsbMt++sfLDn/2xhWHCu2z3lunu27DfNJ/j1T47IICQKkEUNbXfUqM8CxeRyTnxjbXYG8Ay5/z+pqJObLKszqTv3WZJVSRo8M7nGy3HzRaeV7i1VKypNV61i+zuy7mlrBflztKvvuVwHbyVwHrfFS9RifEsrOte+MV9hGZFYVEcjESGxWlVJ86Li+W9OHh1snqex6Ng3Er1a046kpxsfa22N+LQNL2xmssJ18XKke/1zt+nd1kKYmP8dht376TvvVaMW1D8zj6i+J2suqUNiZeVh7vww24+e6fnq1o11PV46r97a1K3ZtHBavV8wFxxb2VKVt3po8FMZl3sLq7zl91F/kWnefG+zGr/rHGFvbWi2Sosm68SgviTxb0Q7DFd85sLjGYYU5r9yzzcahaI04LubyHqwZO+bBFjJxQIghWNLJrjTGLo8vfqYDzmTFVr28P4/z/c6Ur6090e95+eX38sNllifR+63828UZEtn1ZDHY96eI32ry0WcVRAf6WbMHTkN2ncWV7IEaxvZYwSwGfF+/Sxz+j/pdMggdGvfbp4k6kMXDraa6+nSrYiS/1yN1hqLgDO4+rOV4aeATZ+WyxtCMKtcobfza3K8MvtDBcH/NSuChyUsi3tvTa7Wbsy+rao/78DN1DJ4XVozfFmzts373fIsTIH3og35ubmcD8zgZsbw9PhwnRl8WIDY9p4e287Jgp2OzXI6xGjbXn5isYsqZKR4+at8njvS5bj+rYv1nFJ/9VK89H2/XHZQZa7sdrVicWFdNL1/EuTBZeex4Q99bN37Ke4+WrjU/bySqbNerx9XcTm52HlertXF1QZD1wcfzal2x6Nnhc+8KbRav+K4yz79c22QFXYz2wb0ax9w877Q4fj3TvnZoyu/yrFsQuVg47Fl/e2my0MDE0RhTpY+Wt631Y728PhVs2RQWJ/fXLKxJO7zQ73yl88lwix1tmqfKzHlln+1Q23xe+KyX+veHD0R31rdvlvpw+75Di4R4Dkish7lMlia2vZUDaDaQPdeHPl+aFKdrO0D2WfvmvkzoRLfqz8yqykeZqMkdrfdLdeunOhDmE9fHDdc7LYQD7Gu54aMVin1iVsUOZo7S84IxfNbvKjv42FShmHxpi3xV4P6clndL9xqvmQxW38f6Z+Pq/ftrJoh17RprSNz9s8naebxiJdbUeD+bV8Ey23i75Fj8aO3zz2rH75mH588cPsrhedyH70zxALf7vld8T34g5dSsj3P9uPQ77xbX8/hcHlt7PDP38bcfl+5vm+3cLdnOqmufbbCVx33L5vqz906+LEBsZ7ahr2S2eL9qZ3fdD5/956Vnv87BOjerT26+1O+YrhQD9+0z2NL3No+fD9s5P9X5cM29lbPrx+PqXB3gieV4Odsw35RtY/ux4f73jvT5LL/iEp+/zo4nG5ztd/o85oXncVTx+Zftf/liSLLBYZ9Y3sv+WpGf9a3vCnP/qmtb16ar7TEb/4pj0WTrQoTdGFl1HChvW6vnmok+y7sHbb5qzF/9nYeF8XHTWLVpnio7521/tvdz7mSp7+09SEDPxpXDpT681/dzQMAXsjCA8YZ//76kowtun8tIVy7W/futnpQL9m17q6v8ANh199r4+9bi27PnN+YhAPjLE5rAK1YfVJM5aYlH5en6hKycrN7lyCZXed3QTADYNXghfLIcAVaXAbzma5rAE7L8D4lz/FbzSXLyiiGHNFIrzyUpxJUm5j6UYKg/DyvH6AMAdg2uhMfY3Oc67NMgAH7zFU3g5UAaFf5v1vfTMj16LtmpzBkJDoqT9pzTjoBdd3Yea27+epiHCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALCOr2gCAKiTX/+Nw2H64yB9vUhf8ud5+rpLXze/84+vE1oIoFP2PijY+0j/Orf3GS0EAAgQAKjbGTlLf5xueMt56pSc0VIAnbB3ER5X6Wuw5i036esotfk5rQXQb57QBABQkzNytUV8CKfp+05oLYDg7X2c/rjeID6EXKAAQM9hBwQA6nBGzkqIjxxZDX3OqihAsPYepT9uLX5lP7X3mJYD6C9f0wQAQU/8Q5PlVciqYx5v/UL/P/+3OJ3s9xu8poGF+DB6rbIyOi3xufk9Ri7uVR0no58rn/NsuT3Tz2Oh5mF/k2f1UttnuOat4lxKvP9d2n43tFznubB8/2vtI7v0xdFSX1y18zLP+6EhBwUAAQIAOzuCY1M+lOGu4cs7qPA7wy2OxoeSn5OUbL9vzeZQEavP60F/E6F2bPFsI32dpL8rTuDb9HXJLldnRenIlb2XHPuOS37noNAXJdxT7FnyzqY8OYB2IQcEIExsJvC5x9dWhoHFez87/sxeCxDZdUpfsrp9W1FY5m0tO2KfNDQP+jsW7SR00pf0w6sKgqd4rVfp53zShHkAaAl2QAB2mxRH5mEoysslx/+j/lm2/mcOy86+sHhvCGEHm64xsvicpMQzc/p5XRYfKjxGjj5SPu91+rnshMDMsi+OtC8OHH2/jNcSBkZ4IAACBCAYx2yc/niljvG2CfFg6XfnOum93zE23mYi9t2JljaJN/z7U8f3WseOCuKjHBPEh7NndGbx9qlnZ+68b1F85GPOhF4EgAABCGXCP95xIpTfFQEz1njkd6ZabHxU9o0tOB4irGyS0N9uuX8bJ7jMyqrrz+si1zWIj5iEdGdj0cjSxmprd6lmpQsrA4t+EFsK4YHjy37LIagA7UIOCMD2STCSmGGd8F1OhEP9zA828cg6KXvrQGulmWnZ6ytxEOHQ4rvLCLlnFrcz72F/PzF2YW9lOWI0ccaggk3WycTCnmz6wVUN4iPh8FMABAiA785YnoA7rPFr5LOv0++6LikubFam23KgxSHZtup6mb72S7ZPGWKL9i7ruMU96++2JZTLcsmKs1NsBGLt7a5Vpc5L2Ode2X6guVp1JIoTegWAAAHw2hmT1bcmT+mWyfZWy1o6caBN8yV4c4dknr4OTbbaeaPOR57rcamOyNZ8AA01cS22Ro4/r0uMjX1+kTh0+3peynMVlUUBOi/hnIIdrvOiXNj8mT776ZK9y/8fyvk8liL02PISYh1v9rQv7un1SN/Ld4AIAwTwBHJAANaLj3ELX7048yL9/k0ngw9DaUddGZ3u8BE2zvBHx5/Zx/wPG6cvVsdyXnjeiTq8C6GZH5RJ4nkt44TxrR/rjmHsYPyVfmOz+yE7bJOla5kV+umZ7qgkdB0ABAiAr+LjoCXxkbNtZ8AmhyEO/HFEFu9NSjxbp5/XsX4/tBS3h9uERUGQgFtsntN3Hbf72bL42CCOAAABAuClEyar41c7fMSywyUrlTar+EclTum1cT76tPLs2tHtWwleG6dvyq5GMAIkRMf7pcV739IdABAgAKFzYuyrrojjK3HGN6ucMhU1sqvyymwOKygjPnJRU4oGqt/45IiUudfI8ef11an9yFDRDpZ5UX3oizN6BQACBCB0bBMfZSX4aIsIEFEiwmKqYS4XK4RIWfFhLARS0oHnUVoMllyRt0ne7dsKv2uxBy3bhNpFHOA9Rhb3R18EQIAAhIvmfthM7vE28bFishRRcKjflde4Ly0+6shhWPGZiUclU8uu9s4cf54zJ1t3wFZ9b+JZadqB6761Q5utDF0MwZlWe5rVGKJmMwYEJ6ItzzlKGrieYPsiAAIEIAxeWr6/cuyxlILUk9BHFjsftk7ibMOE+lodmdGa94jjIuUq37a1wliiHHEVR2to8YzmO1x3HnK3MQcofW/+nOT1vuUSoTahfYnD55yHKL7UPjnc0l7y3eL83VnaTp0O6rHew2DpWmNdYGhLaIa4O2CzSJA4fpaDJdst0xcXtmvWhOACAAIEwOXEZ3Z1FtWxn9V4jd+tcJQuTLkVVJmIx/JKf0/O7TgvM7mm7z0z5Q+yO99yIrGNACl73knZz4wrOC+R3ntU4ZmOtK1z4Xdel9MqB16aHQ94Sz/j+y1vkUpulyWE2qmxrzg3LPTNCxXJZzvcS9k++6OiDaizerHl+kc1PEebhZJahY/2+duyNiVngSz9/rdmt5POoxJ9cW/bIorex3EFuxjqS37vIv0cWZS6RIgAbIeDCAEeOt2+U6kErzpqHyo4x4Ik5t+WDI14WuX6HIitMuKolhPkxZFOX7fqiEUO+qA4tJ/kmVmGo/jUz282tNdA++Mns3u568XJ7ennfdohObtUn10SHyO1p3HVdmjo+dVdyc3mWu5a6IvJJvGhffFabffARV802TlOfSgUAIAAAXCE1aTR0iQztHGidYL9YHY/0V3u9dp1Gzp0bmaOP++jRR+oKuzKCL9Plnk/ZYhq7qNrc1u0vW4d9MdVdiEiedyQ3d+WtMW7GtrXp0MIK9t7Df3aapFDv/+TA+Gxri8iQgAQIADlHCfL95+2cI228dG3DkVBVMLBKy2QSiRxug41iVx+XsERrXMVd6DOTBSQHd1saa9RjW11pQUeahH1hXOCBru0xQ5O+9DyV+oOBfL9UNT3a9pxXLPt5nY7NACAAAFwLEAO0gnmqqYwmU0TW1nHow5n77UjZ27u8F7LJkU/ddUX9JnXLT5ypq4q7jQkZN63JNZyriwdP5v3XlnYVB2VsGwd2rp3QGyuZ77DgkAlVuXpqfi4aqAfDhr6HgAECEDgVJmsZTL7UDH0o07ncWDqWWmONlzf0HFb+1yC96IhZ1quY9KCgK3KfFksNSw+rBw/mz6r9mezu/KuhnuzLZRR9w7I0OJaZjssCFShTfHxZbwkFAsAAQKwjarx2jIJy6rrt5o4PKzp+lw4cPmhiOf6ih0KIZv7Tlw5hqbhErx6bbaCM1GHSNr8Uts9KXFf+46dyLqdoWXxYRuy5NLxi1z2CRWdlduihTEgbqCdhzvYe9198W6FELZ9hjJWSr3d5+nrR2KPxj6s7rUBgEdQhhfg3unMz+aoKiDEOZDk2pP0c2S1T1ZAbxyW4dxlwhYndmW50vRaTypMzLte37bqPDbPoOkSvMcW17bYwVgXQqViJtLPXG6//RpWsOdr7i+y+P1Nu0PLq/6nxr6amZQynRbtRp1H+SybHYhj47bSmlX+VU3n57y0bMvasFzZT9b8XbxiDB1ZfOamsXVZKNgIYXl2hyvGbrneWKveRTX0GwAECEBPeevQGV+suKWTVX6gX7zjZ1YNWZDJ9GiDQzR1dM8uq1Y5nbQdh0HYfNbhJgGq/ybtP106R+SoDgdWz+a4XGqbyMKZmi2f5bClzU8s+8TK9tK2OJScK1N+90lytAZbRFxdOzN1HSjpvJJbW/aePpejFX3mzMK+3pU9/8Xyc2clxP9b00AOC0CXIQQL4LGDFjv+WFm1lYoou1YzquJE55PpbMM9266Urnu/y9VZ16Emu55XUKTsM4xtdr9EoKpzf9jwCd8u26bIhWV/OCzRXhNjt7K/bcfkpYP2i3MRWeiLdzU9q9ZOCd/BDoTvSr7vqWO7z8MAbXYtj0qMiRw0CLAj7IAAPEZifuuoICUTdqQ7IkcVHP9hBaHgPIxng5ixqVq1zXlwHWoSOf68ugTjyso9NeP8gMZCaFlZJmXEmvTl9LNjUz4U64VD8bWMLFa8revE+jVtakPd1+VcLNTRF022C1f2OV+W3HkM4dBaAK9hBwRghZNjsmTDukpYivNU5YA5WweklPiwDE+6ceA8uC7BW+Y52ThLrp77oIUyzVV4VkPb2Kw4J5Y7PjahRaMd/30dsoAwaUp8VLR/nw4hrKNQhOu+KNd4XvK9rzx6DgAIEIAOipDLmr4iP6hqXObNFXIYzi0maJsqLesO9rJxjlyW4C3rALoMXbHZIZHnK2WaTzwWIkOHbVMU2WWxLVcbu7jpHarVTRoOkaskQDwvwbvrZyYln/HYYjHjxmLBZmzRTh8NACBAAGwmcFnlNPXuhlyV3AmxcV4Ti+RMm0ThTSvVNs7R3KFjWNYhtnGWtn2mrQMs3y35EFKm+VqcIs/EyMhh2+R9yuYZTlu6tyoCJNY8Md+F4syj6ykbtldHfovNTsXbktd4aznW3RgAQIAAVBAi4nTspX88MvXU1i8TphNZfF6pFeXCGQ1lmThyjratCNbhaA0dft77HZ71gba5T2Jk4LitbXY/kprDmAaOBchRi8/phcV76y7BW4eNDmr4zLLj5nzbLk16zwfG/kDNtw3sRAEgQAA6LkSmWqVIxMjU4SQvk/m2XQinCZ/qQNgk2k+3JEfbOCRJifYoy3cl79Wl43bj6NnnYkTygc7aECKWeUhl79mmgEDdq8OJQwEybTjnYxcH/a7ma3Fp77ZioazdRxZtFq/5jIEuEshYeV1BJF0aAFgJVbAA7IXI4lwNeemq2Gtjt+q7CvmMsw3/7izhUw8ePLWYTKeravYvYbM661KAxCXeY/N5dyWev1RikmTVC0ddaqDP43X6uUcOzoupy6ktu+o8ctneOzqqiaM+K5ybdqlDLFbF5aGjOa4LRdi0152GVw10vHih9xhVbB9p/yN2PwDWww4IwG5iRBIXpWzvc7NbLPtwSwz00OKaZmuEh6zkfVLH2aX4cO3Iug41cV6tR/MApo67kzzj0oUJWnAky+42WeUrtWi+Ntd50+buR4XdsZlHbVeHcC1jpzbjiIyJH0y2Kyy7kic7iI+tZy8BAAIEwJUQSdRRFyESV/yYyIEAmS85LqP0Jaexf6sTq83nHJYUH9uufbmtnB1CWEPN/pnFd0vb1LEqftWgCLEpwVumXw8t7WZW8zUnLvqssa/U1aZQbELYuT6nx6rvlNwlbCO36hLxAYAAAWhLiEieyLTCr6+cMC2rw8wKv3dmslU9m4O48lr4z8seiGe5OlvGcYgsrrUtZyl/3tLGdVRJu6pQerkKQ8dtY/N5SQPX/NlBn523cDjkrsKubgHi8tBR23ssa6NRg89nqmPmhLArgHKQAwJQjxA50iRIG8fhxa6T/ZJTZ+sUy+rdeYUJ1GV+Sh27Fa53VFY5WHu6a3Fsqh9ut8yFihsvHNuSbdOEALFxLGMHfdaH1ewm2rUOmy9bgncY2PPI21l2xtouTgAQJOyAANSHbdjGwIGz9LngMN5YOiOfK67e2TgP20rw1nEWgOtDDdc56FMt17ynYm7XldBoh8PyXD87LxysCrtCMwd91geH90UNdlH1GdTRdr4JrE33I7a9l9q67HicIT4AqsEOCEB9xCarbrTrZL3LrsA7i2s4NtXKRrp0Hmw+a2t1nZoONdwmRGb6HCZaJU0OQxtX/LgDU1Mpz5oOfqubyMYWNghqm37xnQf3XUseU82itY5FglJ274i5tuWd/owJrwJAgAB0kXWOzi45DFMLASKVuKIKZWDbKsHrOiTIueOmu1A3abvKIY4nKvIGNbVtyE5tWV5bLgC4aNfYg/t2Wq2swWv5HEBfzE8r/6zjU7JFvAIAAgTAHZJ/4HjScVW5pvLkLOEB6X2JAxWV/P3jCg6Xy7KrbZbgrc1x034lhw2Ko3NtIYyGNXb5yIe2sbDPoeXzfOeoz/rgiLou9NDUtSQl3/eyxecxsKj2BwCOIAcEwHxJfnZ9BsMry/fHuzrRawSUTS7KQYW8A5vr2+aQuK6u45PjlodnnXvS7Z/W0DZ17pTY2GayJWl+ZPnM2hybIstfqVsw1ZGPUkdVLVtxCwAIEIDmxYc6JVdavtaF02DjOCSrnHPLiXHdxHxj6ZTYirCyzoPL04tbK8Er/WXHErmJJ13f+QGNlv0ssrTRY4vPfueoz/rwrKzOs2hAMLV5CKFN/4rr6Isb+icAIEAAKomPnNP072+rOpn6e9eWv/Z2zd/bCJD5Gockj3Euy7HFvUa7Xl/FSbyVEryF/nJbYWXaN7EydNk2+r7Y0lYOSr711NLxvXTUZ30QIL4VC4gs+s28RB8Y1mD3tu89rdIQetCrnLU0ZjYFsIMcEOiz+FjseKyZ4GWS/aAx++/KHESmzulJhclMJumpA+djU4nbdxaTpKzwj6WsrEsH32TVZFw5WmW/d2TRHzbmAK0QqyJCpI1sDx87dthmTQgQW6dWbKW0sJAcpS3tPla7Ksu2s2xCS763OfldCkl87+h7D5fHvRoOHbUSwpZ98c6i30i7XZXNBVHRdFoYU+X3pySuAyBAAMqIj9sSzog4UpIXUSzJWJxcR/oZL031bfy3GyYuJ8mysjKd3kNiMdkfm3KnudcRxlNKWKT3c6HPQ67hxkHoiYTfvdPPmxWdrzU7ZUYdkAMVqm83XYN+xpWFc27jxFXp/3U4fcJ7i3scqZA7XA5BVCfvwrK95DMuHfZZH0rwDlv63rghe6+lBK/Yr47bZcfQsfa581U7eWq/Msa/XtEnB9pXSWYHQIAA7Cw+lieYqCAyTh1dzjaHySaHYZsD/lYnybIO/qiEU//M4fXZcmLuVzhnDj7/oOBYyDMprv5eb3CUBipExgWhOis4r0/1d20FalzjIWd1VDLKudF+ZrNL9Sltu1nBaR1WdLyPSqxC2/TZ2LTPqIXvXFeG1uaZfPSgL761HKsXY3zBjo1FfxT7f1dHkjwAAgSgG9iexVAnhw7DRbZNzjcWAiRvp20rekOH17erk3bj+PNywXplIR6Wheou1Fkty+b6rA5+k/6ctpmt4+fC0T4v6fzZ9NnQSvC6Im7Q3l/WOIZcVhzvBxVtWMbXPaZYgO2QhA69Q+N8px5cylGJHQZnJW71322c9HGJmG+X1xfv0JYvLB2pUs6wJiyPW+gblzWvpNqU4J1VsLEz02z+xFS/06nQCbAEryvuLO1sF7FQW06OLu40GRYlO8cnBgAQIAAbREhb5zHMVXxMtzgfdUzM7y2vdZvz7bqcaVWHb+j48waalB6rA9PkSriEv0zqdpQs+2slgd1Qu00tD5LrbAleh8QOridx3RerJHlrLte0wbZ7ZQAAAQKwYWI6S3/sN+xoiEO8X7LClHMnUb/XScWmmsqZvnXsUL/d4VmNCm22b5pZ0b/R76qboYWdxBXta6b3UqcIObcRHx0vwetMfGxw9COL55+UeB5Dm+vaYaxvYtd7rv1x3wAAAgSghHMlMbvnNTtK+eS0ZxHWYTM52zjHNmFYQ4uzGna+PnX2Kzkaq5xLdYKq7nRFRWdanl2N/STvH4d1l/LUnbVhDf1qkwhxLd4SFfJnNS8WtM3TFr7zrsG2GzX1PGre9ZZxa6/m/giAAAHomAiZ68TxXCeoxLVjKZ9dYXKyESA25UJtdwWOtznojq/vsKIIGa55vtLulxU+79maz3ruWIg07bzYPLeZA/tyKd4SFWrPK+7M1NVn66KVHZCyAn/LuFcGmwT0jw76Ym6/sYN2muu4In3xqMaKdQCdhCpYAAUhkv6QCepMJ9tX6rDYOgEzneDuyhxguIEbi4lyZnGfs/T+XIQJTGu6PnkO+3oA3XGJ9pdreG827OxITkX6ee/18w5KPr+3JfrJQaGflBWM8+I1t3B4mU2M+p1D+5L2uvz/2buDo7aBKAzASwdJBSEdOKdcTQXEHTgVEHdAOggVBDogB852B7gD1EEoAe+wGnsIcbRCsqPV981wwp6B5yfYX7urTfU/D83P96jqer3xeuqtZ3sU9wIddB/InmBXz2Y1/cyaOPiZOCkonKXlXxeZf+O77EUYtRMlgH9LZ4fUS1dOX/nHHAeRj8d+ak6hta9rPn05GGlzFzwtQZqE7SGSu5/h+i2BYOcu8fQvPVId805p+t0fMga17/sMSDvX1eTFz1R/rmunSxd7XcdrZNk0DKZZtL5/nteu3dZ/awABBMCg7252GZqfzxFnZ2aqRk+9uAzNl8QtNr34Q9WgHPaAAIxjwDcJeYcD3qgaPfXit5C3H+da1UAAAWB44WOZ8ZbKGnd66sV5eD4xvHH4sAwPymMTOkDZA754tznOfORsZv6qcnTch+9SH+acFB6Dx0L1QAABYBgDvmka8E0z33prwy0d9+I89eJp5lu/m/0AAQSA/3+wFx9tetEieERVMPtBN30YZzy+tAwedRC28RwKZQ8IQFnOW4aPeKd55o4zXUh91DZ8rAVhEEAAGI5fLcPHmXNs6FibBxmsUy8KwiCAADAE6elVOYM34YO+5D7KWfgAAQSAgbrNeN1H4YOewnDsq6rhy+OG80/CB4yDTegA5YnLsOZ7vh8HhQtnfXCgMLzv0bur1ItCMIzIiRIAlOfz3ex3+PPsj3h3+Woz2LtUIQ7Uh/EQzHshGBBAAMof+P0M21mQONiLS1yuVYYj9OJD2D4Na5V6caUyMF6WYAGUqd4AfGOwx5Fdbb4+hOfZt0o5AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIDBeRJgAKqqtVx8a9qwAAAAAElFTkSuQmCC";

/**
 * SpokesLogo — the official SPOKES logo. Renders the full-color mark on
 * transparent ground. Size it with `height` (width scales to the 800×532
 * aspect). On dark surfaces the logo reads well as-is; pass `plate` to sit it
 * on a white rounded plate (as the lesson title/corner marks do).
 */
function SpokesLogo({
  height = 120,
  plate = false,
  alt = "SPOKES — Skills for Life",
  src,
  style,
  ...rest
}) {
  const img = React.createElement("img", {
    src: src || LOGO_SRC,
    alt,
    style: {
      height: typeof height === "number" ? height + "px" : height,
      width: "auto",
      display: "block"
    }
  });
  if (!plate) {
    return React.createElement("span", {
      style: {
        display: "inline-flex",
        ...style
      },
      ...rest
    }, img);
  }
  return React.createElement("span", {
    style: {
      display: "inline-flex",
      background: "var(--light)",
      padding: "0.9rem 1.1rem",
      borderRadius: "var(--radius-md)",
      boxShadow: "var(--shadow-sm)",
      ...style
    },
    ...rest
  }, img);
}
Object.assign(__ds_scope, { SpokesLogo });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/controls/SpokesLogo.jsx", error: String((e && e.message) || e) }); }

// components/controls/SpokesWordmark.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SpokesWordmark — a typographic stand-in for the SPOKES logo (the program's
 * PNG logo was not present in the source materials, so this is a CSS wordmark).
 * "SPOKES" in the display serif with a gold underline rule and an optional
 * "Skills for Life" tagline. Use `onLight` on dark surfaces.
 */
function SpokesWordmark({
  tagline = true,
  onLight = false,
  size = 1,
  style,
  ...rest
}) {
  const fg = onLight ? "var(--light)" : "var(--dark)";
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "inline-flex",
      flexDirection: "column",
      alignItems: "flex-start",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: `${2.4 * size}rem`,
      lineHeight: 1,
      letterSpacing: `${0.18 * size}rem`,
      color: fg,
      fontWeight: "var(--fw-regular)"
    }
  }, "SPOKES"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "block",
      width: "100%",
      height: `${0.22 * size}rem`,
      background: "var(--gold)",
      margin: `${0.28 * size}rem 0 0`,
      borderRadius: "2px"
    }
  }), tagline ? /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: `${0.62 * size}rem`,
      letterSpacing: `${0.22 * size}rem`,
      textTransform: "uppercase",
      color: onLight ? "var(--gold)" : "var(--muted-gold)",
      marginTop: `${0.35 * size}rem`,
      fontWeight: "var(--fw-semibold)"
    }
  }, "Skills for Life") : null);
}
Object.assign(__ds_scope, { SpokesWordmark });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/controls/SpokesWordmark.jsx", error: String((e && e.message) || e) }); }

// components/controls/WippeaBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * WippeaBadge — the small colored letter badge marking a WIPPEA stage
 * (Warm-Up, Introduction, Presentation, Evaluation, Application). Used in the
 * lesson sidebar and anywhere a chapter's stage is referenced.
 */
function WippeaBadge({
  stage = "p",
  label,
  style,
  ...rest
}) {
  const s = String(stage).toLowerCase();
  const map = {
    w: {
      letter: "W",
      bg: "var(--gold)",
      fg: "var(--dark)",
      border: "none"
    },
    i: {
      letter: "I",
      bg: "var(--primary)",
      fg: "var(--light)",
      border: "none"
    },
    p: {
      letter: "P",
      bg: "var(--accent)",
      fg: "var(--light)",
      border: "none"
    },
    e: {
      letter: "E",
      bg: "var(--gold)",
      fg: "var(--dark)",
      border: "none"
    },
    a: {
      letter: "A",
      bg: "var(--dark)",
      fg: "var(--gold)",
      border: "1px solid var(--gold)"
    }
  }[s] || {
    letter: "P",
    bg: "var(--accent)",
    fg: "var(--light)",
    border: "none"
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      display: "inline-block",
      fontFamily: "var(--font-body)",
      fontSize: "0.6rem",
      fontWeight: "var(--fw-bold)",
      letterSpacing: "1px",
      padding: "0.15rem 0.4rem",
      borderRadius: "4px",
      textTransform: "uppercase",
      background: map.bg,
      color: map.fg,
      border: map.border,
      ...style
    }
  }, rest), label || map.letter);
}
Object.assign(__ds_scope, { WippeaBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/controls/WippeaBadge.jsx", error: String((e && e.message) || e) }); }

// components/frameworks/BigStatement.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * BigStatement — a full-slide impact statement. Large centered serif text on a
 * soft radial background, capped to a readable measure. Use for key takeaways,
 * transitions, or quotes. Inline emphasis via <Emphasis>.
 */
function BigStatement({
  children,
  subtitle,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      background: "var(--grad-statement-bg)",
      padding: "4rem 5rem",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: "4.5rem",
      fontWeight: "var(--fw-regular)",
      lineHeight: "var(--lh-heading)",
      color: "var(--dark)",
      maxWidth: "900px",
      margin: 0
    }
  }, children), subtitle ? /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "1.5rem",
      color: "var(--gray)",
      maxWidth: "700px",
      marginTop: "2rem"
    }
  }, subtitle) : null);
}

/**
 * Emphasis — inline colored emphasis for statement/body text.
 * Colors are AA-safe on light backgrounds.
 */
function Emphasis({
  children,
  tone = "primary",
  style,
  ...rest
}) {
  const color = {
    primary: "var(--primary)",
    accent: "var(--accent-text)",
    gold: "var(--muted-gold)",
    mauve: "var(--mauve)"
  }[tone] || "var(--primary)";
  return /*#__PURE__*/React.createElement("span", _extends({
    style: {
      color,
      fontWeight: "var(--fw-bold)",
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { BigStatement, Emphasis });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/frameworks/BigStatement.jsx", error: String((e && e.message) || e) }); }

// components/frameworks/Matrix.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Matrix — the 2×2 decision grid (Eisenhower-style). Exactly four cells in a
 * fixed color order: blue (do-first), green (schedule), gold (delegate),
 * muted (eliminate). Each cell has a small uppercase label, a serif action
 * word, and a short description.
 */
function Matrix({
  cells = [],
  style,
  ...rest
}) {
  const roles = [{
    bg: "var(--primary)",
    fg: "var(--light)"
  }, {
    bg: "var(--accent)",
    fg: "var(--light)"
  }, {
    bg: "var(--gold)",
    fg: "var(--dark)"
  }, {
    bg: "var(--muted)",
    fg: "var(--gray)",
    border: "2px solid var(--offwhite)"
  }];
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: "1.5rem",
      ...style
    }
  }, rest), cells.slice(0, 4).map((c, i) => /*#__PURE__*/React.createElement(MatrixCell, {
    key: i,
    role: roles[i],
    cell: c
  })));
}
function MatrixCell({
  role,
  cell
}) {
  const [hover, setHover] = React.useState(false);
  const lift = role.bg !== "var(--muted)";
  return /*#__PURE__*/React.createElement("div", {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      padding: "1.5rem",
      borderRadius: "var(--radius-xl)",
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "0.5rem",
      background: role.bg,
      color: role.fg,
      border: role.border || "none",
      transition: "transform var(--dur-base) var(--ease-out), box-shadow var(--dur-base) var(--ease-out), filter var(--dur-base) var(--ease-out)",
      transform: hover ? lift ? "translateY(-8px) scale(1.02)" : "translateY(-5px)" : "none",
      boxShadow: hover ? lift ? "var(--shadow-pop)" : "var(--shadow-hover)" : "none",
      filter: hover && lift ? "brightness(1.12)" : "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "0.8rem",
      textTransform: "uppercase",
      letterSpacing: "var(--ls-eyebrow)",
      opacity: 0.85
    }
  }, cell.label), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: "2rem",
      fontWeight: "var(--fw-regular)"
    }
  }, cell.action), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-body)",
      fontSize: "1.1rem",
      opacity: 0.9
    }
  }, cell.desc));
}
Object.assign(__ds_scope, { Matrix });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/frameworks/Matrix.jsx", error: String((e && e.message) || e) }); }

// components/frameworks/SmartStack.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SmartStack — letter-keyed rows for acronyms (SMART, FOCUS, …). Each row is a
 * colored square holding one character plus a titled definition panel.
 * Letters alternate blue / gold.
 */
function SmartStack({
  rows = [],
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "0.4rem",
      ...style
    }
  }, rest), rows.map((r, i) => {
    const alt = r.alt ?? i % 2 === 1;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        gap: "0.75rem",
        alignItems: "center"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: "44px",
        height: "44px",
        background: alt ? "var(--gold)" : "var(--primary)",
        color: alt ? "var(--dark)" : "var(--light)",
        borderRadius: "var(--radius-md)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-body)",
        fontSize: "1.5rem",
        fontWeight: "var(--fw-bold)",
        flexShrink: 0
      }
    }, r.letter), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        background: "var(--muted)",
        padding: "0.5rem 1.25rem",
        borderRadius: "var(--radius-md)"
      }
    }, /*#__PURE__*/React.createElement("h4", {
      style: {
        fontFamily: "var(--font-display)",
        fontSize: "1.15rem",
        color: "var(--primary)",
        margin: 0,
        fontWeight: "var(--fw-regular)"
      }
    }, r.title), r.detail ? /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-body)",
        fontSize: "0.95rem",
        color: "var(--gray)",
        margin: 0
      }
    }, r.detail) : null));
  }));
}
Object.assign(__ds_scope, { SmartStack });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/frameworks/SmartStack.jsx", error: String((e && e.message) || e) }); }

// components/frameworks/SplitLayout.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * SplitLayout — a two-column layout pairing a text column with a visual
 * (usually a VisualCircle). Text left, visual right by default; set
 * `reverse` to flip.
 */
function SplitLayout({
  children,
  visual,
  reverse = false,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      gap: "4rem",
      alignItems: "center",
      flexDirection: reverse ? "row-reverse" : "row",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, children), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "0 0 300px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, visual));
}
Object.assign(__ds_scope, { SplitLayout });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/frameworks/SplitLayout.jsx", error: String((e && e.message) || e) }); }

// components/frameworks/Takeaways.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * Takeaways — a vertical stack of numbered items. Each row is a colored circle
 * (blue by default, gold when odd/`alt`) plus text. Numbers pop in with a
 * spring. Good for steps, discussion questions, or reflection prompts.
 */
function Takeaways({
  items = [],
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "0.75rem",
      ...style
    }
  }, rest), items.map((it, i) => {
    const text = typeof it === "object" && it !== null && "text" in it ? it.text : it;
    const alt = typeof it === "object" && it !== null && "alt" in it ? it.alt : i % 2 === 1;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        alignItems: "center",
        gap: "1rem"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: "40px",
        height: "40px",
        background: alt ? "var(--gold)" : "var(--primary)",
        color: alt ? "var(--dark)" : "var(--light)",
        borderRadius: "var(--radius-round)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-body)",
        fontSize: "1.25rem",
        fontWeight: "var(--fw-bold)",
        flexShrink: 0
      }
    }, i + 1), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: "var(--font-body)",
        fontSize: "1.35rem",
        lineHeight: "var(--lh-body)",
        color: "var(--gray)",
        margin: 0
      }
    }, text));
  }));
}
Object.assign(__ds_scope, { Takeaways });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/frameworks/Takeaways.jsx", error: String((e && e.message) || e) }); }

// ui_kits/lesson/LessonViewer.jsx
try { (() => {
/* global React */
// SPOKES lesson viewer — interactive shell (sidebar + slide stage + nav).
// Exposes window.SPOKESLessonViewer.
(function () {
  const {
    useState,
    useEffect,
    useCallback
  } = React;
  const h = React.createElement;
  const {
    WippeaBadge,
    SpokesLogo
  } = window.SPOKESDesignSystem_8b5e5e;
  const {
    LESSON,
    SLIDES
  } = window.SPOKESLessonSlides;
  const CHAPTER_NAMES = {
    1: "Warm-Up",
    2: "Introduction",
    3: "Sort by Priority",
    4: "Set Better Goals",
    5: "Watch the Traps",
    6: "Evaluation",
    7: "Application"
  };
  const CHAPTER_STAGE = {
    1: "w",
    2: "i",
    3: "p",
    4: "p",
    5: "p",
    6: "e",
    7: "a"
  };
  function fireConfetti() {
    const c = document.getElementById("sp-confetti");
    if (!c) return;
    c.innerHTML = "";
    const colors = ["#37b550", "#007baf", "#d3b257", "#a7253f", "#ffffff"];
    for (let i = 0; i < 90; i++) {
      const d = document.createElement("div");
      d.className = "sp-confetti-bit";
      d.style.left = Math.random() * 100 + "%";
      d.style.background = colors[Math.random() * colors.length | 0];
      d.style.animationDelay = Math.random() * 2 + "s";
      d.style.animationDuration = Math.random() * 2 + 3 + "s";
      const s = Math.random() * 8 + 6;
      d.style.width = s + "px";
      d.style.height = s + "px";
      d.style.borderRadius = Math.random() > 0.5 ? "50%" : "0";
      c.appendChild(d);
    }
  }
  function Sidebar({
    index,
    collapsed,
    onToggle,
    onGo
  }) {
    // group slides by chapter
    const chapters = [];
    SLIDES.forEach((s, i) => {
      let c = chapters.find(x => x.chapter === s.chapter);
      if (!c) {
        c = {
          chapter: s.chapter,
          slides: []
        };
        chapters.push(c);
      }
      c.slides.push({
        ...s,
        index: i
      });
    });
    const activeChapter = SLIDES[index].chapter;
    return h("nav", {
      className: "sp-sidebar" + (collapsed ? " sp-collapsed" : "")
    }, h("div", {
      className: "sp-side-head"
    }, h(SpokesLogo, {
      height: 46,
      plate: true
    })), h("div", {
      className: "sp-side-title"
    }, LESSON.title), h("ul", {
      className: "sp-chapters"
    }, chapters.map(c => h("li", {
      key: c.chapter,
      className: "sp-chapter" + (c.chapter === activeChapter ? " sp-active" : "")
    }, h("div", {
      className: "sp-chapter-head",
      onClick: () => onGo(c.slides[0].index)
    }, h("span", {
      className: "sp-arrow" + (c.chapter === activeChapter ? " sp-open" : "")
    }, "\u25B6"), h(WippeaBadge, {
      stage: CHAPTER_STAGE[c.chapter]
    }), h("span", {
      className: "sp-chapter-name"
    }, CHAPTER_NAMES[c.chapter])), c.chapter === activeChapter ? h("ul", {
      className: "sp-slide-list"
    }, c.slides.map(s => h("li", {
      key: s.index,
      className: "sp-slide-item" + (s.index === index ? " sp-active" : ""),
      onClick: e => {
        e.stopPropagation();
        onGo(s.index);
      }
    }, s.name))) : null))), h("div", {
      className: "sp-resources"
    }, h("div", {
      className: "sp-res-title"
    }, "Resources"), LESSON.resources.map((r, i) => h("a", {
      key: i,
      className: "sp-res-link",
      href: r.href,
      onClick: e => e.preventDefault()
    }, r.label))), h("div", {
      className: "sp-counter"
    }, "Slide ", index + 1, " of ", SLIDES.length));
  }
  function LessonViewer() {
    const [index, setIndex] = useState(0);
    const [collapsed, setCollapsed] = useState(false);
    const go = useCallback(i => {
      setIndex(Math.max(0, Math.min(SLIDES.length - 1, i)));
    }, []);
    useEffect(() => {
      const onKey = e => {
        if (e.key === "ArrowRight" || e.key === " ") {
          e.preventDefault();
          setIndex(v => Math.min(SLIDES.length - 1, v + 1));
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          setIndex(v => Math.max(0, v - 1));
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, []);
    const slide = SLIDES[index];
    const isTitle = index === 0;
    const isClosing = index === SLIDES.length - 1;
    useEffect(() => {
      if (isClosing) fireConfetti();
    }, [index, isClosing]);
    return h("div", {
      className: "sp-app"
    }, h(Sidebar, {
      index,
      collapsed,
      onToggle: () => setCollapsed(v => !v),
      onGo: go
    }), h("main", {
      className: "sp-main"
    }, h("div", {
      className: "sp-progress",
      style: {
        width: (index + 1) / SLIDES.length * 100 + "%"
      }
    }), h("div", {
      className: "sp-stage",
      key: index
    }, slide.render()), !isTitle && !isClosing ? h("div", {
      className: "sp-brand"
    }, h(SpokesLogo, {
      height: 34
    })) : null, h("div", {
      className: "sp-nav"
    }, h("button", {
      className: "sp-key",
      onClick: () => go(index - 1),
      disabled: index === 0,
      "aria-label": "Previous"
    }, "\u2190"), h("span", null, "to navigate"), h("button", {
      className: "sp-key",
      onClick: () => go(index + 1),
      disabled: index === SLIDES.length - 1,
      "aria-label": "Next"
    }, "\u2192"))));
  }
  window.SPOKESLessonViewer = LessonViewer;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/lesson/LessonViewer.jsx", error: String((e && e.message) || e) }); }

// ui_kits/lesson/slides.jsx
try { (() => {
/* global React */
// SPOKES lesson viewer — slide content. Composes the design-system components.
// Exposes window.SPOKESLessonSlides = { LESSON, SLIDES }.
(function () {
  const DS = window.SPOKESDesignSystem_8b5e5e;
  const {
    Card,
    Takeaways,
    SmartStack,
    Matrix,
    DangerCard,
    SplitLayout,
    VisualCircle,
    BigStatement,
    Emphasis,
    DownloadResource,
    ActivityBox,
    SpokesLogo
  } = DS;
  const h = React.createElement;

  // ---- slide chrome ---------------------------------------------------------
  function TitleSlide() {
    return h("div", {
      className: "sp-slide sp-title"
    }, h(SpokesLogo, {
      height: 150,
      plate: true,
      style: {
        marginBottom: "2.5rem"
      }
    }), h("h1", null, "Time Management"), h("div", {
      className: "sp-divider"
    }), h("p", {
      className: "sp-subtitle"
    }, "Making the Most of Every Hour"), h("p", {
      className: "sp-copyright"
    }, "Copyright © 2026 WV Adult Basic Education"));
  }
  function SectionSlide({
    num,
    label,
    title,
    glyph
  }) {
    return h("div", {
      className: "sp-slide sp-section",
      "data-num": num
    }, h("div", {
      className: "sp-watermark",
      "aria-hidden": "true"
    }, num), h("div", {
      className: "sp-circle",
      "aria-hidden": "true"
    }, glyph), h("p", {
      className: "sp-chapter-label"
    }, label), h("h2", {
      className: "sp-section-h2"
    }, title), h("div", {
      className: "sp-divider sp-divider-sm"
    }));
  }
  function ContentSlide({
    title,
    subtitle,
    children
  }) {
    return h("div", {
      className: "sp-slide sp-content"
    }, h("h2", null, title), subtitle ? h("p", {
      className: "sp-sub"
    }, subtitle) : null, children);
  }
  function ClosingSlide() {
    return h("div", {
      className: "sp-slide sp-closing"
    }, h("div", {
      className: "sp-confetti",
      id: "sp-confetti"
    }), h("div", {
      className: "sp-closing-box"
    }, h("h3", null, "Congratulations, you have completed this lesson!"), h("p", null, "\u201CUntil we can manage time, we can manage nothing else.\u201D"), h("div", {
      className: "sp-divider sp-divider-c"
    }), h("h2", {
      className: "sp-closing-h2"
    }, "Go make the hours count.")));
  }

  // ---- lesson data ----------------------------------------------------------
  const LESSON = {
    title: "Time Management",
    resources: [{
      label: "Self-Assessment",
      href: "#"
    }, {
      label: "Weekly Planner",
      href: "#"
    }, {
      label: "Pre/Post Test",
      href: "#"
    }]
  };
  const SLIDES = [{
    chapter: 1,
    stage: "w",
    name: "Title",
    render: () => h(TitleSlide)
  }, {
    chapter: 1,
    stage: "w",
    name: "Warm-Up",
    render: () => h(ContentSlide, {
      title: "Where does your time go?",
      subtitle: "Take two minutes before we begin."
    }, h(Takeaways, {
      items: ["List everything you did yesterday between 5pm and 9pm.", "Mark each item as chosen or automatic.", "Circle the one you'd most like back."]
    }), h(DownloadResource, {
      style: {
        marginTop: "2rem"
      },
      resources: [{
        label: "Self-Assessment",
        href: "#"
      }]
    }))
  }, {
    chapter: 2,
    stage: "i",
    name: "Introduction",
    render: () => h(SectionSlide, {
      num: "I",
      label: "Introduction",
      title: "Why It Matters",
      glyph: "🎯"
    })
  }, {
    chapter: 2,
    stage: "i",
    name: "The Cost of Drift",
    render: () => h(ContentSlide, {
      title: "Two ways an hour disappears",
      subtitle: "Most lost time isn't dramatic — it's quiet."
    }, h("div", {
      style: {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "2rem"
      }
    }, h(Card, {
      title: "Reaction"
    }, "The day happens to you — every ping sets the next task."), h(Card, {
      title: "Drift",
      border: "gold"
    }, "Small, easy tasks crowd out the ones that matter.")))
  }, {
    chapter: 2,
    stage: "i",
    name: "Key Idea",
    render: () => h("div", {
      className: "sp-slide sp-statement"
    }, h(BigStatement, {
      subtitle: "Every calendar tells the truth about what you value.",
      style: {
        padding: 0,
        background: "transparent"
      }
    }, "Your time is your ", h(Emphasis, {
      tone: "gold"
    }, "most honest"), " resource."))
  }, {
    chapter: 3,
    stage: "p",
    name: "Presentation 1",
    render: () => h(SectionSlide, {
      num: "P1",
      label: "Presentation",
      title: "Sort by Priority",
      glyph: "🕐"
    })
  }, {
    chapter: 3,
    stage: "p",
    name: "Urgent vs Important",
    render: () => h(ContentSlide, {
      title: "Urgent vs. Important"
    }, h(Matrix, {
      cells: [{
        label: "Urgent + Important",
        action: "Do First",
        desc: "Handle it now"
      }, {
        label: "Important, Not Urgent",
        action: "Schedule",
        desc: "Plan a time"
      }, {
        label: "Urgent, Not Important",
        action: "Delegate",
        desc: "Hand it off"
      }, {
        label: "Neither",
        action: "Eliminate",
        desc: "Let it go"
      }]
    }))
  }, {
    chapter: 4,
    stage: "p",
    name: "Presentation 2",
    render: () => h(SectionSlide, {
      num: "P2",
      label: "Presentation",
      title: "Set Better Goals",
      glyph: "✅"
    })
  }, {
    chapter: 4,
    stage: "p",
    name: "SMART Goals",
    render: () => h(ContentSlide, {
      title: "Make each goal SMART"
    }, h(SmartStack, {
      rows: [{
        letter: "S",
        title: "Specific",
        detail: "What exactly will I accomplish?"
      }, {
        letter: "M",
        title: "Measurable",
        detail: "How will I track progress?"
      }, {
        letter: "A",
        title: "Achievable",
        detail: "Is it realistic this week?"
      }, {
        letter: "R",
        title: "Relevant",
        detail: "Does it move what matters?"
      }, {
        letter: "T",
        title: "Time-bound",
        detail: "By when will it be done?"
      }]
    }))
  }, {
    chapter: 5,
    stage: "p",
    name: "Presentation 3",
    render: () => h(SectionSlide, {
      num: "P3",
      label: "Presentation",
      title: "Watch the Traps",
      glyph: "⚠️"
    })
  }, {
    chapter: 5,
    stage: "p",
    name: "Common Traps",
    render: () => h(ContentSlide, {
      title: "Four traps that steal the hour",
      subtitle: "Hover a card to see the fix."
    }, h("div", {
      style: {
        display: "flex",
        gap: "1.5rem"
      }
    }, h(DangerCard, {
      icon: "📱",
      title: "Phone Traps",
      detail: "Notifications fracture deep work — batch them."
    }), h(DangerCard, {
      icon: "⏳",
      title: "Time Sinks",
      detail: "Small tasks quietly eat the hour — time-box them."
    }), h(DangerCard, {
      icon: "🔄",
      title: "Task Switching",
      detail: "Every switch costs focus — finish one thing first."
    }), h(DangerCard, {
      icon: "🙋",
      title: "Over-Committing",
      detail: "Saying yes to all is saying no to what matters."
    })))
  }, {
    chapter: 6,
    stage: "e",
    name: "Evaluation",
    render: () => h(SectionSlide, {
      num: "E",
      label: "Evaluation",
      title: "Check Your Learning",
      glyph: "📝"
    })
  }, {
    chapter: 6,
    stage: "e",
    name: "Exit Ticket",
    render: () => h(ContentSlide, {
      title: "Exit Ticket"
    }, h(Takeaways, {
      items: ["Name one habit you'll start this week.", "Which quadrant holds most of your day right now?", "What is one thing you'll eliminate?"]
    }), h(DownloadResource, {
      style: {
        marginTop: "2rem"
      },
      resources: [{
        label: "Pre/Post Test",
        href: "#"
      }, {
        label: "Rubric",
        href: "#"
      }]
    }))
  }, {
    chapter: 7,
    stage: "a",
    name: "Application",
    render: () => h(SectionSlide, {
      num: "A",
      label: "Application",
      title: "Put It to Work",
      glyph: "🚀"
    })
  }, {
    chapter: 7,
    stage: "a",
    name: "Plan Your Week",
    render: () => h(ContentSlide, {
      title: "Build next week on purpose"
    }, h(SplitLayout, {
      visual: h(VisualCircle, {
        gradient: "gold",
        size: 240
      }, "📅")
    }, h("p", {
      style: {
        fontFamily: "var(--font-body)",
        fontSize: "1.6rem",
        color: "var(--gray)",
        lineHeight: 1.6,
        marginTop: 0
      }
    }, "Block your ", h(Emphasis, null, "top three"), " tasks into next week before anything else claims the time."), h(ActivityBox, {
      label: "Partner Work",
      style: {
        marginTop: "1.5rem"
      }
    }, "Swap planners with a partner and check: does each block match a real priority?")))
  }, {
    chapter: 7,
    stage: "a",
    name: "Closing",
    render: () => h(ClosingSlide)
  }];
  window.SPOKESLessonSlides = {
    LESSON,
    SLIDES
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/lesson/slides.jsx", error: String((e && e.message) || e) }); }

__ds_ns.AreaCard = __ds_scope.AreaCard;

__ds_ns.Card = __ds_scope.Card;

__ds_ns.ContentList = __ds_scope.ContentList;

__ds_ns.DangerCard = __ds_scope.DangerCard;

__ds_ns.VisualCircle = __ds_scope.VisualCircle;

__ds_ns.ActivityBox = __ds_scope.ActivityBox;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.DownloadResource = __ds_scope.DownloadResource;

__ds_ns.SpokesLogo = __ds_scope.SpokesLogo;

__ds_ns.SpokesWordmark = __ds_scope.SpokesWordmark;

__ds_ns.WippeaBadge = __ds_scope.WippeaBadge;

__ds_ns.BigStatement = __ds_scope.BigStatement;

__ds_ns.Emphasis = __ds_scope.Emphasis;

__ds_ns.Matrix = __ds_scope.Matrix;

__ds_ns.SmartStack = __ds_scope.SmartStack;

__ds_ns.SplitLayout = __ds_scope.SplitLayout;

__ds_ns.Takeaways = __ds_scope.Takeaways;

})();
