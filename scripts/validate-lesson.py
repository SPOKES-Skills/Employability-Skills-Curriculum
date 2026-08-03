"""SPOKES Lesson Quality Validator — automated checker for SPOKES lesson HTML files."""
from __future__ import annotations

import argparse
import re
import sys
from collections import namedtuple
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import unquote, urlparse

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
SPEC_VERSION = "v1.0"

CANONICAL_COLORS: dict[str, str] = {
    "--primary": "#007baf",
    "--accent": "#37b550",
    "--dark": "#004071",
    "--light": "#ffffff",
    "--muted": "#edf3f7",
    "--gray": "#60636b",
    "--gold": "#d3b257",
    "--royal": "#00133f",
    "--mauve": "#a7253f",
    "--offwhite": "#d1d3d4",
    "--muted-gold": "#ad8806",
}
CANONICAL_HEX_SET: set[str] = {v.lower() for v in CANONICAL_COLORS.values()}

PROHIBITED_COLORS: list[str] = [
    "#dc2626", "#991b1b", "#ff6b6b", "#ea580c", "#ff6b35",
    "#4c1d95", "#6c23b5", "#2e1065", "#e0e0e0", "#e5e7eb",
    "#5a6a7a", "#2d6db5", "#1e4a7d", "#1a365d", "#2b6cb0",
]

# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------
Result = namedtuple("Result", ["rule_id", "status", "message", "line"])


# ---------------------------------------------------------------------------
# Document model
# ---------------------------------------------------------------------------
class Element:
    __slots__ = ("tag", "attrs", "line")

    def __init__(self, tag: str, attrs: dict[str, str | None], line: int) -> None:
        self.tag = tag
        self.attrs = attrs
        self.line = line


class Document:
    """Parsed representation of a lesson HTML file."""

    def __init__(self) -> None:
        self.raw_html: str = ""
        self.source_path: Path | None = None
        self.style_blocks: list[tuple[str, int]] = []          # (css_text, start_line)
        self.theme_override_css: str = ""
        self.script_blocks: list[tuple[str, int]] = []         # (js_text, start_line)
        self.elements: list[Element] = []
        self.html_attrs: dict[str, str | None] = {}
        self.link_elements: list[Element] = []


# ---------------------------------------------------------------------------
# Parser
# ---------------------------------------------------------------------------
class LessonHTMLParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.doc = Document()
        self._in_style = False
        self._style_start_line = 0
        self._style_id: str | None = None
        self._style_buf: list[str] = []
        self._in_script = False
        self._script_start_line = 0
        self._script_buf: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict: dict[str, str | None] = dict(attrs)
        line = self.getpos()[0]
        elem = Element(tag, attrs_dict, line)
        self.doc.elements.append(elem)

        if tag == "html":
            self.doc.html_attrs = attrs_dict
        if tag == "link":
            self.doc.link_elements.append(elem)
        if tag == "style":
            self._in_style = True
            self._style_start_line = line
            self._style_id = attrs_dict.get("id")
            self._style_buf = []
        if tag == "script":
            self._in_script = True
            self._script_start_line = line
            self._script_buf = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "style" and self._in_style:
            css_text = "".join(self._style_buf)
            if self._style_id == "theme-override":
                self.doc.theme_override_css = css_text
            else:
                self.doc.style_blocks.append((css_text, self._style_start_line))
            self._in_style = False
        if tag == "script" and self._in_script:
            js_text = "".join(self._script_buf)
            self.doc.script_blocks.append((js_text, self._script_start_line))
            self._in_script = False

    def handle_data(self, data: str) -> None:
        if self._in_style:
            self._style_buf.append(data)
        elif self._in_script:
            self._script_buf.append(data)


def parse_document(html: str) -> Document:
    parser = LessonHTMLParser()
    parser.doc.raw_html = html
    parser.feed(html)
    return parser.doc


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _all_css(doc: Document) -> str:
    """Return all non-theme-override CSS concatenated."""
    return "\n".join(block for block, _line in doc.style_blocks)


def _all_css_with_override(doc: Document) -> str:
    """Return ALL CSS including the theme-override block."""
    parts = [block for block, _line in doc.style_blocks]
    if doc.theme_override_css:
        parts.append(doc.theme_override_css)
    return "\n".join(parts)


def _all_script(doc: Document) -> str:
    """Return all script content concatenated."""
    return "\n".join(block for block, _line in doc.script_blocks)


def _extract_root_block(css: str) -> str:
    """Extract the first :root { ... } block from CSS."""
    m = re.search(r':root\s*\{([^}]*)\}', css, re.DOTALL)
    return m.group(1) if m else ""


def _css_outside_root(css: str) -> str:
    """Return CSS with :root { ... } blocks removed."""
    return re.sub(r':root\s*\{[^}]*\}', '', css, flags=re.DOTALL)


def _css_outside_root_with_override(doc: Document) -> str:
    """Return all CSS (including theme-override) with :root blocks removed."""
    return _css_outside_root(_all_css_with_override(doc))


def _has_class(elem: Element, cls: str) -> bool:
    classes = (elem.attrs.get("class") or "").split()
    return cls in classes


def _class_contains(elem: Element, substr: str) -> bool:
    return substr in (elem.attrs.get("class") or "")


def _find_css_line(doc: Document, pattern: str) -> int:
    """Find the line number where a CSS pattern appears."""
    for css_text, start_line in doc.style_blocks:
        lines = css_text.split('\n')
        for i, line in enumerate(lines):
            if re.search(pattern, line, re.IGNORECASE):
                return start_line + i
    return 0


def _find_html_line(doc: Document, pattern: str) -> int:
    """Find line number of a raw HTML pattern."""
    for i, line in enumerate(doc.raw_html.split('\n'), 1):
        if re.search(pattern, line, re.IGNORECASE):
            return i
    return 0


# ---------------------------------------------------------------------------
# Check: Colors (CLR-01 .. CLR-08)
# ---------------------------------------------------------------------------
def check_colors(doc: Document) -> list[Result]:
    results: list[Result] = []
    css = _all_css(doc)
    css_with_override = _all_css_with_override(doc)
    root_block = _extract_root_block(css)
    outside_root = _css_outside_root_with_override(doc)

    # CLR-01: All 11 canonical variables present with correct hex
    # (Only checks main style block :root — NOT theme-override)
    missing: list[str] = []
    wrong: list[str] = []
    for var_name, expected_hex in CANONICAL_COLORS.items():
        pattern = re.compile(
            rf'{re.escape(var_name)}\s*:\s*(#[0-9a-fA-F]{{3,8}})',
            re.IGNORECASE,
        )
        m = pattern.search(root_block)
        if not m:
            missing.append(var_name)
        elif m.group(1).lower() != expected_hex.lower():
            wrong.append(var_name)
    if missing or wrong:
        msg = "Root palette incomplete or incorrect"
        if missing:
            msg += f" — missing: {', '.join(missing)}"
        if wrong:
            msg += f" — wrong values: {', '.join(wrong)}"
        results.append(Result("CLR-01", "FAIL", msg, _find_css_line(doc, r':root')))
    else:
        results.append(Result("CLR-01", "PASS", "All 11 canonical palette variables present and correct", 0))

    # CLR-02: Non-canonical hex outside :root (includes theme-override and inline style= attributes)
    hex_matches = re.findall(r'#[0-9a-fA-F]{3,8}\b', outside_root)
    inline_hex = re.findall(
        r'style=["\'][^"\']*#([0-9a-fA-F]{3,8})\b[^"\']*["\']',
        doc.raw_html, re.IGNORECASE
    )
    all_hex_matches = hex_matches + [f'#{h}' for h in inline_hex]
    non_canonical = [h for h in all_hex_matches if h.lower() not in CANONICAL_HEX_SET]
    if non_canonical:
        unique = sorted(set(h.lower() for h in non_canonical))
        line = _find_css_line(doc, re.escape(non_canonical[0]))
        results.append(Result("CLR-02", "FAIL", f"Non-canonical hex colors outside :root: {', '.join(unique)}", line))
    else:
        results.append(Result("CLR-02", "PASS", "No non-canonical hex colors outside :root", 0))

    # CLR-03: Specifically check for #c9a74a (includes theme-override)
    if re.search(r'#c9a74a', css_with_override, re.IGNORECASE):
        line = _find_css_line(doc, r'#c9a74a')
        results.append(Result("CLR-03", "FAIL", "Found deprecated color #c9a74a — use var(--muted-gold) instead", line))
    else:
        results.append(Result("CLR-03", "PASS", "No deprecated #c9a74a found", 0))

    # CLR-04: rgba is permitted (INFO)
    results.append(Result("CLR-04", "PASS", "rgba() usage is permitted", 0))

    # CLR-05: .gold should use --muted-gold not --gold (includes theme-override)
    # \.gold(?![\w-]) ensures .gold-border etc. are not matched (class boundary).
    # (?:^|[;{\s])color\s*: ensures only the 'color' property is matched, not
    # border-color / border-left-color / background-color etc. (property boundary).
    css_outside = _css_outside_root_with_override(doc)
    gold_rule = re.search(
        r'\.gold(?![\w-])[^{]*\{[^}]*(?:^|[;{\s])color\s*:\s*var\(\s*--gold\s*\)',
        css_outside, re.IGNORECASE | re.MULTILINE
    )
    if gold_rule:
        line = _find_css_line(doc, r'\.gold(?![\w-]).*color.*var\(\s*--gold\s*\)')
        results.append(Result("CLR-05", "FAIL", ".gold text uses var(--gold) — should use var(--muted-gold) for contrast", line))
    else:
        results.append(Result("CLR-05", "PASS", ".gold text correctly uses var(--muted-gold)", 0))

    # CLR-06: .accent should use --dark not --accent (includes theme-override)
    # Same dual-boundary approach: \.accent(?![\w-]) for class boundary,
    # (?:^|[;{\s])color\s*: for property boundary.
    accent_bad = re.search(
        r'\.accent(?![\w-])[^{]*\{[^}]*(?:^|[;{\s])color\s*:\s*var\(\s*--accent\s*\)',
        css_outside, re.IGNORECASE | re.MULTILINE
    )
    if accent_bad:
        line = _find_css_line(doc, r'\.accent(?![\w-]).*color.*var\(\s*--accent\s*\)')
        results.append(Result("CLR-06", "FAIL", ".accent text uses var(--accent) — should use var(--dark)", line))
    else:
        results.append(Result("CLR-06", "PASS", ".accent text correctly uses var(--dark)", 0))

    # CLR-07: Confetti hex arrays in script — proximity-constrained to avoid false
    # positives from unrelated hex values (e.g. quiz answer arrays) that happen to
    # appear in the same file as a confetti function elsewhere.  The pattern requires
    # the hex literal to appear within ~200 chars of the word "confetti" without
    # crossing a statement boundary (;).
    all_js = _all_script(doc)
    if re.search(r'confetti[^;]{0,200}#[0-9a-fA-F]{3,8}', all_js, re.IGNORECASE | re.DOTALL):
        results.append(Result("CLR-07", "WARN", "Hardcoded hex colors found in confetti script block", 0))
    else:
        results.append(Result("CLR-07", "PASS", "No hardcoded confetti colors found", 0))

    # CLR-08: Check against prohibited colors (includes theme-override)
    all_hex_in_css = re.findall(r'#[0-9a-fA-F]{3,8}\b', css_with_override)
    prohibited_lower = {p.lower() for p in PROHIBITED_COLORS}
    prohibited_found = [h for h in all_hex_in_css if h.lower() in prohibited_lower]
    if prohibited_found:
        unique = sorted(set(h.lower() for h in prohibited_found))
        results.append(Result("CLR-08", "FAIL", f"Prohibited colors found: {', '.join(unique)}", 0))
    else:
        results.append(Result("CLR-08", "PASS", "No prohibited colors found", 0))

    return results


# ---------------------------------------------------------------------------
# Check: Typography (TYP-01 .. TYP-05)
# ---------------------------------------------------------------------------
def check_typography(doc: Document) -> list[Result]:
    results: list[Result] = []
    css = _all_css(doc)
    root_block = _extract_root_block(css)

    # TYP-01: --font-heading and --font-body with correct defaults
    has_heading = re.search(r'--font-heading\s*:', root_block)
    has_body = re.search(r'--font-body\s*:', root_block)
    heading_ok = re.search(r'--font-heading\s*:.*DM Serif Display', root_block)
    body_ok = re.search(r'--font-body\s*:.*Outfit', root_block)
    if has_heading and has_body and heading_ok and body_ok:
        results.append(Result("TYP-01", "PASS", "Font variables present with correct defaults", 0))
    elif has_heading and has_body:
        results.append(Result("TYP-01", "WARN", "Font variables present but defaults may be wrong", 0))
    else:
        missing_parts = []
        if not has_heading:
            missing_parts.append("--font-heading")
        if not has_body:
            missing_parts.append("--font-body")
        results.append(Result("TYP-01", "FAIL", f"Missing font variables in :root: {', '.join(missing_parts)}", 0))

    # TYP-02: Font overrides in :root (not in theme-override)
    heading_val = re.search(r'--font-heading\s*:\s*"([^"]+)"', root_block)
    body_val = re.search(r'--font-body\s*:\s*"([^"]+)"', root_block)
    bad_fonts: list[str] = []
    if heading_val and heading_val.group(1) != "DM Serif Display":
        bad_fonts.append(f'--font-heading uses "{heading_val.group(1)}"')
    if body_val and body_val.group(1) != "Outfit":
        bad_fonts.append(f'--font-body uses "{body_val.group(1)}"')
    if bad_fonts:
        line = _find_css_line(doc, r'--font-heading')
        results.append(Result("TYP-02", "FAIL", f"Font override in :root — move to theme-override: {'; '.join(bad_fonts)}", line))
    else:
        results.append(Result("TYP-02", "PASS", "No font overrides in :root block", 0))

    # TYP-03: Hardcoded heading font outside :root and theme-override
    outside = _css_outside_root(css)
    if re.search(r"""['"]DM Serif Display['"]""", outside):
        results.append(Result("TYP-03", "WARN", "Hardcoded 'DM Serif Display' found outside :root — use var(--font-heading)", 0))
    else:
        results.append(Result("TYP-03", "PASS", "No hardcoded heading font outside :root", 0))

    # TYP-04: Hardcoded body font outside :root
    if re.search(r"""['"]Outfit['"]""", outside):
        results.append(Result("TYP-04", "WARN", "Hardcoded 'Outfit' found outside :root — use var(--font-body)", 0))
    else:
        results.append(Result("TYP-04", "PASS", "No hardcoded body font outside :root", 0))

    # TYP-05: Google Fonts display=swap
    fonts_links = [e for e in doc.link_elements if 'fonts.googleapis.com' in (e.attrs.get('href') or '') and e.attrs.get('rel') != 'preconnect']
    if fonts_links:
        all_have_swap = all('display=swap' in (e.attrs.get('href') or '') for e in fonts_links)
        if all_have_swap:
            results.append(Result("TYP-05", "PASS", "Google Fonts links include display=swap", 0))
        else:
            results.append(Result("TYP-05", "WARN", "Google Fonts link missing display=swap", 0))
    else:
        results.append(Result("TYP-05", "PASS", "No Google Fonts links to check (or fonts loaded differently)", 0))

    return results


# ---------------------------------------------------------------------------
# Check: Accessibility (ACC-01 .. ACC-19, maps to A11Y-01 .. A11Y-19)
# ---------------------------------------------------------------------------
def _acc(num: int) -> str:
    """Return the ACC-XX rule id for accessibility checks."""
    return f"ACC-{num:02d}"


def _a11y_msg(num: int, msg: str) -> str:
    """Prefix message with the A11Y-XX reference for traceability."""
    return f"A11Y-{num:02d}: {msg}"


def check_accessibility(doc: Document) -> list[Result]:
    results: list[Result] = []
    raw = doc.raw_html

    # A11Y-01: Tab ARIA — detect tabs by role markup OR class so prefixed
    # variants (e.g. qa-tab-btn) cannot skip validation entirely.
    has_tabs = (
        any(_has_class(e, "tab-btn") for e in doc.elements)
        or any(e.attrs.get("role") == "tablist" for e in doc.elements)
    )
    if has_tabs:
        has_tablist = any(e.attrs.get("role") == "tablist" for e in doc.elements)
        has_tab_role = any(e.attrs.get("role") == "tab" for e in doc.elements)
        has_tabpanel = any(e.attrs.get("role") == "tabpanel" for e in doc.elements)
        has_aria_selected = any(
            'aria-selected' in e.attrs
            for e in doc.elements
            if e.attrs.get("role") == "tab" or _has_class(e, "tab-btn")
        )
        has_aria_controls_tabs = any(
            'aria-controls' in e.attrs
            for e in doc.elements
            if e.attrs.get("role") == "tab" or _has_class(e, "tab-btn")
        )
        if has_tablist and has_tab_role and has_tabpanel and has_aria_selected and has_aria_controls_tabs:
            results.append(Result(_acc(1), "PASS", _a11y_msg(1, "Tab ARIA roles and attributes present"), 0))
        else:
            results.append(Result(_acc(1), "FAIL", _a11y_msg(1, "Tab component missing required ARIA attributes"), 0))
    else:
        results.append(Result(_acc(1), "PASS", _a11y_msg(1, "No tab components found (auto-pass)"), 0))

    # A11Y-02: Accordion ARIA
    has_accordion = any(_class_contains(e, "accordion") for e in doc.elements)
    if has_accordion:
        has_expanded = any(
            'aria-expanded' in e.attrs
            for e in doc.elements
            if _class_contains(e, "accordion")
        )
        has_controls = any(
            'aria-controls' in e.attrs
            for e in doc.elements
            if _class_contains(e, "accordion")
        )
        if has_expanded and has_controls:
            results.append(Result(_acc(2), "PASS", _a11y_msg(2, "Accordion ARIA attributes present"), 0))
        else:
            results.append(Result(_acc(2), "FAIL", _a11y_msg(2, "Accordion missing aria-expanded or aria-controls"), 0))
    else:
        results.append(Result(_acc(2), "PASS", _a11y_msg(2, "No accordion components found (auto-pass)"), 0))

    # A11Y-03: Danger card ARIA
    danger_cards = [e for e in doc.elements if _has_class(e, "danger-card")]
    if danger_cards:
        ok = all(
            'tabindex' in e.attrs and ('aria-expanded' in e.attrs or 'aria-pressed' in e.attrs)
            for e in danger_cards
        )
        if ok:
            results.append(Result(_acc(3), "PASS", _a11y_msg(3, "Danger cards have tabindex and ARIA attributes"), 0))
        else:
            results.append(Result(_acc(3), "FAIL", _a11y_msg(3, "Danger card missing tabindex or aria-expanded/aria-pressed"), 0))
    else:
        results.append(Result(_acc(3), "PASS", _a11y_msg(3, "No danger cards found (auto-pass)"), 0))

    # A11Y-04: Skip link
    skip_links = [
        e for e in doc.elements
        if e.tag == "a" and (
            _has_class(e, "skip-link") or
            (e.attrs.get("href") or "").startswith("#main")
        )
    ]
    if skip_links:
        results.append(Result(_acc(4), "PASS", _a11y_msg(4, "Skip link present"), 0))
    else:
        results.append(Result(_acc(4), "FAIL", _a11y_msg(4, "No skip-to-content link found"), 0))

    # A11Y-05: aria-live announcer
    if 'aria-live' in raw:
        results.append(Result(_acc(5), "PASS", _a11y_msg(5, "Live region (aria-live) found"), 0))
    else:
        results.append(Result(_acc(5), "FAIL", _a11y_msg(5, "No aria-live region found for slide announcements"), 0))

    # A11Y-06: Video aria-label
    videos = [e for e in doc.elements if e.tag == "video"]
    if videos:
        all_labeled = all('aria-label' in e.attrs for e in videos)
        if all_labeled:
            results.append(Result(_acc(6), "PASS", _a11y_msg(6, "All videos have aria-label"), 0))
        else:
            results.append(Result(_acc(6), "FAIL", _a11y_msg(6, "One or more videos missing aria-label"), 0))
    else:
        results.append(Result(_acc(6), "PASS", _a11y_msg(6, "No videos found (auto-pass)"), 0))

    # A11Y-07: Video captions — per-video check (not total track count).
    # Counts videos whose <video>...</video> block contains a <track kind="captions"> child.
    # This catches cases where one video has multiple tracks and another has none.
    video_count = len(videos)
    if video_count == 0:
        results.append(Result(_acc(7), "PASS", _a11y_msg(7, "No videos — captions check auto-pass"), 0))
    else:
        videos_with_captions = len(re.findall(
            r'<video[^>]*>(?:(?!</video>).)*?<track[^>]*\bkind=["\']captions["\'][^>]*/?>',
            doc.raw_html, re.DOTALL | re.IGNORECASE
        ))
        empty_vtts: list[str] = []
        if doc.source_path is not None:
            base_dir = doc.source_path.parent
            for e in doc.elements:
                if e.tag != "track" or e.attrs.get("kind") != "captions":
                    continue
                src = e.attrs.get("src") or ""
                if not src or src.startswith(("http:", "https:", "//")):
                    continue
                vtt_path = base_dir / src
                if vtt_path.exists() and "-->" not in vtt_path.read_text(encoding="utf-8", errors="replace"):
                    empty_vtts.append(src)

        if empty_vtts:
            results.append(Result(_acc(7), "FAIL", _a11y_msg(7, f"Caption file(s) contain no cues: {', '.join(empty_vtts)}"), 0))
        elif videos_with_captions >= video_count:
            results.append(Result(_acc(7), "PASS", _a11y_msg(7, f"All {video_count} video(s) have caption tracks"), 0))
        else:
            results.append(Result(_acc(7), "FAIL", _a11y_msg(7, f"Only {videos_with_captions} of {video_count} video(s) have caption tracks"), 0))

    # A11Y-08: Nav aria-label
    navs = [e for e in doc.elements if e.tag == "nav"]
    if navs:
        all_labeled = all('aria-label' in e.attrs for e in navs)
        if all_labeled:
            results.append(Result(_acc(8), "PASS", _a11y_msg(8, "All nav elements have aria-label"), 0))
        else:
            results.append(Result(_acc(8), "FAIL", _a11y_msg(8, "Nav element missing aria-label"), 0))
    else:
        results.append(Result(_acc(8), "PASS", _a11y_msg(8, "No nav elements found (auto-pass)"), 0))

    # A11Y-09: Nav buttons should be <button> not <span>
    nav_spans = [
        e for e in doc.elements
        if e.tag == "span" and (
            _class_contains(e, "prev") or _class_contains(e, "next") or _class_contains(e, "nav-btn")
        )
    ]
    if nav_spans:
        results.append(Result(_acc(9), "FAIL", _a11y_msg(9, "Navigation uses <span> instead of <button>"), nav_spans[0].line))
    else:
        results.append(Result(_acc(9), "PASS", _a11y_msg(9, "Navigation buttons use semantic <button> elements"), 0))

    # A11Y-10: Progress bar ARIA
    progressbars = [e for e in doc.elements if e.attrs.get("role") == "progressbar"]
    if progressbars:
        has_valuenow = all('aria-valuenow' in e.attrs for e in progressbars)
        if has_valuenow:
            results.append(Result(_acc(10), "PASS", _a11y_msg(10, "Progress bar has role and aria-valuenow"), 0))
        else:
            results.append(Result(_acc(10), "FAIL", _a11y_msg(10, "Progress bar missing aria-valuenow"), 0))
    else:
        results.append(Result(_acc(10), "PASS", _a11y_msg(10, "No progress bars found (auto-pass)"), 0))

    # A11Y-11: All img have alt
    imgs = [e for e in doc.elements if e.tag == "img"]
    if imgs:
        all_have_alt = all('alt' in e.attrs for e in imgs)
        if all_have_alt:
            results.append(Result(_acc(11), "PASS", _a11y_msg(11, "All images have alt attributes"), 0))
        else:
            results.append(Result(_acc(11), "FAIL", _a11y_msg(11, "One or more images missing alt attribute"), 0))
    else:
        results.append(Result(_acc(11), "PASS", _a11y_msg(11, "No images found (auto-pass)"), 0))

    # A11Y-12: focus-visible count (all CSS including theme-override —
    # focus styles may legitimately live in the override block)
    css = _all_css_with_override(doc)
    focus_count = len(re.findall(r':focus-visible', css))
    if focus_count >= 6:
        results.append(Result(_acc(12), "PASS", _a11y_msg(12, f"Found {focus_count} :focus-visible rules (>= 6)"), 0))
    else:
        results.append(Result(_acc(12), "FAIL", _a11y_msg(12, f"Only {focus_count} :focus-visible rules — need at least 6"), 0))

    # A11Y-13: html lang attribute
    if 'lang' in doc.html_attrs and doc.html_attrs['lang']:
        results.append(Result(_acc(13), "PASS", _a11y_msg(13, f"html lang=\"{doc.html_attrs['lang']}\" set"), 0))
    else:
        results.append(Result(_acc(13), "FAIL", _a11y_msg(13, "<html> missing lang attribute"), 0))

    # A11Y-14: Heading level skips (heuristic)
    headings = [(e.tag, e.line) for e in doc.elements if re.match(r'^h[1-6]$', e.tag)]
    skipped = False
    if len(headings) > 1:
        for i in range(1, len(headings)):
            prev_level = int(headings[i - 1][0][1])
            curr_level = int(headings[i][0][1])
            if curr_level > prev_level + 1:
                skipped = True
                break
    if skipped:
        results.append(Result(_acc(14), "WARN", _a11y_msg(14, "Heading levels appear to skip (e.g. h1 to h3)"), 0))
    else:
        results.append(Result(_acc(14), "PASS", _a11y_msg(14, "No heading level skips detected"), 0))

    # A11Y-15: Empty link text (heuristic)
    empty_links = re.findall(r'<a\s[^>]*>\s*</a>', raw)
    if empty_links:
        results.append(Result(_acc(15), "WARN", _a11y_msg(15, "Empty link(s) found — add visible or aria text"), 0))
    else:
        results.append(Result(_acc(15), "PASS", _a11y_msg(15, "No empty links detected"), 0))

    # A11Y-16: Color-alone quiz indicators (heuristic — PASS by default)
    results.append(Result(_acc(16), "PASS", _a11y_msg(16, "Color-alone indicators check (heuristic pass)"), 0))

    # A11Y-17: Sidebar nav ARIA
    nav_with_label = any(e.tag == "nav" and 'aria-label' in e.attrs for e in doc.elements)
    sidebar_btn = any(
        'aria-expanded' in e.attrs and 'aria-controls' in e.attrs
        for e in doc.elements
        if _has_class(e, "sidebar-toggle")
    )
    if nav_with_label and sidebar_btn:
        results.append(Result(_acc(17), "PASS", _a11y_msg(17, "Sidebar navigation has proper ARIA"), 0))
    elif nav_with_label:
        results.append(Result(_acc(17), "PASS", _a11y_msg(17, "Nav has aria-label (sidebar toggle not found)"), 0))
    else:
        results.append(Result(_acc(17), "WARN", _a11y_msg(17, "Sidebar navigation may be missing ARIA attributes"), 0))

    # A11Y-18: Viewport meta
    viewport = any(
        e.tag == "meta" and e.attrs.get("name") == "viewport"
        for e in doc.elements
    )
    if viewport:
        results.append(Result(_acc(18), "PASS", _a11y_msg(18, "Viewport meta tag present"), 0))
    else:
        results.append(Result(_acc(18), "FAIL", _a11y_msg(18, "Missing <meta name=\"viewport\">"), 0))

    # A11Y-19: Title element
    has_title = any(e.tag == "title" for e in doc.elements)
    if has_title:
        results.append(Result(_acc(19), "PASS", _a11y_msg(19, "Page has <title> element"), 0))
    else:
        results.append(Result(_acc(19), "FAIL", _a11y_msg(19, "Missing <title> element"), 0))

    return results


# ---------------------------------------------------------------------------
# Check: Components (CMP-01 .. CMP-02)
# ---------------------------------------------------------------------------
def check_components(doc: Document) -> list[Result]:
    results: list[Result] = []
    raw = doc.raw_html

    # CMP-01: Tab buttons must use the standard tab-btn class (no qa- variants)
    if re.search(r'\bqa-tab-btn\b', raw):
        results.append(Result("CMP-01", "WARN", "Non-standard tab class qa-tab-btn found — use tab-btn", 0))
    else:
        results.append(Result("CMP-01", "PASS", "No non-standard tab button classes", 0))

    # CMP-02: Accordion items must use accordion-* classes (no qa- variants)
    if re.search(r'\bqa-accordion[\w-]*\b', raw):
        results.append(Result("CMP-02", "WARN", "Non-standard accordion class qa-accordion-* found — use accordion-*", 0))
    else:
        results.append(Result("CMP-02", "PASS", "No non-standard accordion classes", 0))

    return results


# ---------------------------------------------------------------------------
# Check: Navigation (NAV-01 .. NAV-12)
# ---------------------------------------------------------------------------
def check_navigation(doc: Document) -> list[Result]:
    results: list[Result] = []
    js = _all_script(doc)

    # NAV-01: const/let usage (vs var)
    if re.search(r'\b(const|let)\s+', js):
        results.append(Result("NAV-01", "PASS", "Modern variable declarations (const/let) used", 0))
    else:
        results.append(Result("NAV-01", "FAIL", "No const/let declarations found — avoid var", 0))

    # NAV-02: Video pause on slide change
    video_count = sum(1 for e in doc.elements if e.tag == "video")
    if video_count == 0:
        results.append(Result("NAV-02", "PASS", "No videos found (auto-pass)", 0))
    elif '.pause()' in js:
        results.append(Result("NAV-02", "PASS", "Video pause on navigation detected", 0))
    else:
        results.append(Result("NAV-02", "FAIL", "No .pause() call found — videos may continue on slide change", 0))

    # NAV-03: Focus management
    if 'activeElement' in js and '.blur()' in js:
        results.append(Result("NAV-03", "PASS", "Focus management (activeElement/blur) present", 0))
    else:
        results.append(Result("NAV-03", "FAIL", "Missing focus management on navigation", 0))

    # NAV-04: Slide announcer
    if 'slideAnnouncer' in js or 'announcer' in js:
        results.append(Result("NAV-04", "PASS", "Slide announcer integration found", 0))
    else:
        results.append(Result("NAV-04", "FAIL", "No slide announcer found for screen readers", 0))

    # NAV-05: View transitions
    if 'startViewTransition' in js:
        results.append(Result("NAV-05", "PASS", "View Transitions API integration found", 0))
    else:
        results.append(Result("NAV-05", "WARN", "No startViewTransition found — consider adding", 0))

    # NAV-06: sessionStorage (CRITICAL)
    if 'sessionStorage' in js:
        results.append(Result("NAV-06", "PASS", "sessionStorage used for slide persistence", 0))
    else:
        results.append(Result("NAV-06", "FAIL", "No sessionStorage found — slide position not persisted", 0))

    # NAV-07: sessionStorage.getItem
    if 'sessionStorage.getItem' in js:
        results.append(Result("NAV-07", "PASS", "sessionStorage.getItem used for slide restoration", 0))
    else:
        results.append(Result("NAV-07", "WARN", "No sessionStorage.getItem — slide restore may be missing", 0))

    # NAV-08: confettiTriggered guard — WARN when confetti exists unguarded
    has_confetti = 'confetti' in js.lower() or 'triggerGoldStars' in js
    if 'confettiTriggered' in js:
        results.append(Result("NAV-08", "PASS", "Confetti trigger guard present", 0))
    elif has_confetti:
        results.append(Result("NAV-08", "WARN", "Confetti present without confettiTriggered guard — will re-fire on revisit", 0))
    else:
        results.append(Result("NAV-08", "PASS", "No confetti feature (auto-pass)", 0))

    # NAV-09: Textarea/input guard in keydown
    if 'textarea' in js.lower() and 'input' in js.lower() and 'keydown' in js.lower():
        results.append(Result("NAV-09", "PASS", "Keyboard navigation guards for text inputs present", 0))
    else:
        results.append(Result("NAV-09", "WARN", "May be missing textarea/input guard in keydown handler", 0))

    # NAV-10: Touch events with passive
    if 'touchstart' in js and 'passive' in js:
        results.append(Result("NAV-10", "PASS", "Touch events use passive listeners", 0))
    else:
        results.append(Result("NAV-10", "WARN", "Touch event passive option not detected", 0))

    # NAV-11: switchTab function — auto-pass only when no tab markup exists
    has_tab_markup = any(
        e.attrs.get("role") == "tab" or _has_class(e, "tab-btn") or _has_class(e, "qa-tab-btn")
        for e in doc.elements
    )
    if 'switchTab' in js:
        results.append(Result("NAV-11", "PASS", "switchTab function found", 0))
    elif has_tab_markup:
        results.append(Result("NAV-11", "WARN", "Tab markup present but no canonical switchTab(btn, panelId) function", 0))
    else:
        results.append(Result("NAV-11", "PASS", "No tab switching needed (auto-pass)", 0))

    # NAV-12: toggleAccordion function — auto-pass only when no accordion markup
    has_accordion_markup = any(_class_contains(e, "accordion") for e in doc.elements)
    if 'toggleAccordion' in js:
        results.append(Result("NAV-12", "PASS", "toggleAccordion function found", 0))
    elif has_accordion_markup:
        results.append(Result("NAV-12", "WARN", "Accordion markup present but no canonical toggleAccordion(btn) function", 0))
    else:
        results.append(Result("NAV-12", "PASS", "No accordion toggling needed (auto-pass)", 0))

    return results


# ---------------------------------------------------------------------------
# Check: Theme (THM-01 .. THM-05)
# ---------------------------------------------------------------------------
def check_theme(doc: Document) -> list[Result]:
    results: list[Result] = []
    css = _all_css(doc)

    # THM-01: theme-override style block
    has_theme_override = any(
        e.tag == "style" and e.attrs.get("id") == "theme-override"
        for e in doc.elements
    )
    if has_theme_override:
        results.append(Result("THM-01", "PASS", "Theme override style block present", 0))
    else:
        results.append(Result("THM-01", "FAIL", "Missing <style id=\"theme-override\"> block", 0))

    # THM-02/03/04: data-chapter scoping (heuristic — PASS by default)
    results.append(Result("THM-02", "PASS", "Chapter scoping check (heuristic pass)", 0))
    results.append(Result("THM-03", "PASS", "Chapter scoping check (heuristic pass)", 0))
    results.append(Result("THM-04", "PASS", "Chapter scoping check (heuristic pass)", 0))

    # THM-05: Dark theme lessons must put class="theme-dark" on the .main
    # element, with supporting .theme-dark CSS (which lives in theme-override).
    css_all = _all_css_with_override(doc)
    has_dark_css = '.theme-dark' in css_all
    main_has_dark = any(
        _has_class(e, "theme-dark") and (e.tag == "main" or _has_class(e, "main"))
        for e in doc.elements
    )
    if has_dark_css and main_has_dark:
        results.append(Result("THM-05", "PASS", "Dark theme class on .main with supporting CSS", 0))
    elif has_dark_css:
        results.append(Result("THM-05", "FAIL", ".theme-dark CSS found but .main element lacks theme-dark class", 0))
    elif main_has_dark:
        results.append(Result("THM-05", "FAIL", ".main has theme-dark class but no .theme-dark CSS rules found", 0))
    else:
        results.append(Result("THM-05", "PASS", "No dark theme (auto-pass)", 0))

    return results


# ---------------------------------------------------------------------------
# Check: Mobile (MOB-01 .. MOB-04)
# ---------------------------------------------------------------------------
def check_mobile(doc: Document) -> list[Result]:
    results: list[Result] = []
    css = _all_css_with_override(doc)
    js = _all_script(doc)

    # MOB-01: Danger card hover/click
    has_danger_hover = re.search(r'\.danger-card:hover', css)
    if has_danger_hover:
        has_click = 'danger-card' in js and ('click' in js or 'addEventListener' in js)
        if has_click:
            results.append(Result("MOB-01", "PASS", "Danger card has both hover and click support", 0))
        else:
            results.append(Result("MOB-01", "WARN", "Danger card has :hover but no click handler found", 0))
    else:
        results.append(Result("MOB-01", "PASS", "No danger-card:hover (auto-pass)", 0))

    # MOB-02: Sidebar toggle size >= 44px
    toggle_match = re.search(
        r'\.sidebar-toggle\s*\{[^}]*\}', css, re.DOTALL
    )
    if toggle_match:
        block = toggle_match.group(0)
        w_match = re.search(r'width\s*:\s*(\d+)', block)
        h_match = re.search(r'height\s*:\s*(\d+)', block)
        w = int(w_match.group(1)) if w_match else 0
        h = int(h_match.group(1)) if h_match else 0
        if w >= 44 and h >= 44:
            results.append(Result("MOB-02", "PASS", f"Sidebar toggle size {w}x{h}px meets 44px minimum", 0))
        else:
            line = _find_css_line(doc, r'\.sidebar-toggle')
            results.append(Result("MOB-02", "FAIL", f"Sidebar toggle size {w}x{h}px — minimum is 44x44px", line))
    else:
        results.append(Result("MOB-02", "WARN", "No .sidebar-toggle CSS rule found", 0))

    # MOB-03: Nav button sizing
    nav_match = re.search(r'\.nav-btn\s*\{[^}]*\}', css, re.DOTALL)
    if nav_match:
        block = nav_match.group(0)
        w_match = re.search(r'(?:min-)?width\s*:\s*(\d+)', block)
        h_match = re.search(r'(?:min-)?height\s*:\s*(\d+)', block)
        w = int(w_match.group(1)) if w_match else 0
        h = int(h_match.group(1)) if h_match else 0
        if w >= 44 and h >= 44:
            results.append(Result("MOB-03", "PASS", f"Nav buttons meet 44px touch target ({w}x{h}px)", 0))
        else:
            results.append(Result("MOB-03", "FAIL", f"Nav button size {w}x{h}px — minimum 44x44px", 0))
    else:
        results.append(Result("MOB-03", "PASS", "No .nav-btn rule found (auto-pass)", 0))

    # MOB-04: Active styles (heuristic)
    results.append(Result("MOB-04", "PASS", "Touch feedback check (heuristic pass)", 0))

    return results


# ---------------------------------------------------------------------------
# Check: Performance (PRF-01 .. PRF-03)
# ---------------------------------------------------------------------------
def check_performance(doc: Document) -> list[Result]:
    results: list[Result] = []

    # PRF-01: Video preload=none
    videos = [e for e in doc.elements if e.tag == "video"]
    if not videos:
        results.append(Result("PRF-01", "PASS", "No videos — preload check auto-pass", 0))
    else:
        all_none = all(e.attrs.get("preload") == "none" for e in videos)
        if all_none:
            results.append(Result("PRF-01", "PASS", "All videos have preload=\"none\"", 0))
        else:
            results.append(Result("PRF-01", "FAIL", "One or more videos missing preload=\"none\"", 0))

    # PRF-02: Always PASS (INFO)
    results.append(Result("PRF-02", "PASS", "Asset optimization check (info)", 0))

    # PRF-03: Preconnect links
    preconnects = [e for e in doc.link_elements if e.attrs.get("rel") == "preconnect"]
    if preconnects:
        results.append(Result("PRF-03", "PASS", "Preconnect hints found", 0))
    else:
        results.append(Result("PRF-03", "PASS", "No preconnect links (acceptable)", 0))

    return results


# ---------------------------------------------------------------------------
# Check: References (REF-01 .. REF-02)
# ---------------------------------------------------------------------------
def _is_skipped_reference(value: str) -> bool:
    ref = value.strip()
    if not ref:
        return True
    lower = ref.lower()
    return (
        ref.startswith("#") or
        lower.startswith(("http://", "https://", "mailto:", "tel:", "data:", "javascript:"))
    )


def _local_reference_path(value: str) -> str:
    """Return the local filesystem portion of a URL-like reference."""
    parsed = urlparse(value.strip())
    return unquote(parsed.path)


def check_references(doc: Document) -> list[Result]:
    """Verify local href/src/poster references resolve relative to the lesson file."""
    results: list[Result] = []

    unsafe_blank_targets = [
        elem
        for elem in doc.elements
        if elem.tag == "a"
        and (elem.attrs.get("target") or "").lower() == "_blank"
        and not {"noopener", "noreferrer"}.issubset(set((elem.attrs.get("rel") or "").lower().split()))
    ]
    if unsafe_blank_targets:
        first = unsafe_blank_targets[0]
        results.append(Result(
            "REF-02",
            "FAIL",
            'Links with target="_blank" must include rel="noopener noreferrer"',
            first.line,
        ))
    else:
        results.append(Result("REF-02", "PASS", 'All target="_blank" links include rel="noopener noreferrer"', 0))

    if doc.source_path is None:
        results.append(Result("REF-01", "PASS", "Local reference check skipped (source path unavailable)", 0))
        return results

    base_dir = doc.source_path.parent
    missing: list[tuple[str, str, str, int]] = []
    for elem in doc.elements:
        for attr in ("href", "src", "poster"):
            value = elem.attrs.get(attr)
            if value is None or _is_skipped_reference(value):
                continue

            local_path = _local_reference_path(value)
            if not local_path:
                continue

            target = base_dir / local_path
            if not target.exists():
                missing.append((elem.tag, attr, value, elem.line))

    if missing:
        examples = "; ".join(
            f"{tag}[{attr}] line {line}: {value}"
            for tag, attr, value, line in missing[:5]
        )
        more = f"; +{len(missing) - 5} more" if len(missing) > 5 else ""
        results.append(Result("REF-01", "FAIL", f"Missing local references: {examples}{more}", missing[0][3]))
        return results

    results.append(Result("REF-01", "PASS", "All local href/src/poster references resolve", 0))
    return results


# ---------------------------------------------------------------------------
# Check: Engagement (ENG-01 .. ENG-04)
# ---------------------------------------------------------------------------
def check_engagement(doc: Document) -> list[Result]:
    results: list[Result] = []

    # ENG-01: Checkpoint/quiz count
    checkpoints = [e for e in doc.elements if _class_contains(e, "checkpoint") or _class_contains(e, "quiz")]
    if len(checkpoints) >= 2:
        results.append(Result("ENG-01", "PASS", f"Found {len(checkpoints)} checkpoints/quizzes", 0))
    else:
        results.append(Result("ENG-01", "WARN", f"Only {len(checkpoints)} checkpoint(s) — consider adding more", 0))

    # ENG-02: Post-video activities (heuristic — PASS by default)
    results.append(Result("ENG-02", "PASS", "Post-video activity check (heuristic pass)", 0))

    # ENG-03: Activity box count
    activities = [e for e in doc.elements if _has_class(e, "activity-box")]
    if len(activities) >= 3:
        results.append(Result("ENG-03", "PASS", f"Found {len(activities)} activity boxes", 0))
    else:
        results.append(Result("ENG-03", "WARN", f"Only {len(activities)} activity box(es) — consider adding more", 0))

    # ENG-04: Interactive ratio (heuristic — PASS by default)
    results.append(Result("ENG-04", "PASS", "Interactive element ratio check (info)", 0))

    return results


# ---------------------------------------------------------------------------
# Check: Reduced Motion (RDM-01 .. RDM-06)
# ---------------------------------------------------------------------------
def _reduced_motion_blocks(css: str) -> str:
    """Extract the contents of all prefers-reduced-motion @media blocks."""
    blocks: list[str] = []
    for m in re.finditer(r'@media[^{]*prefers-reduced-motion[^{]*\{', css):
        depth = 1
        i = m.end()
        start = i
        while i < len(css) and depth:
            if css[i] == '{':
                depth += 1
            elif css[i] == '}':
                depth -= 1
            i += 1
        blocks.append(css[start:i])
    return "\n".join(blocks)


def check_reduced_motion(doc: Document) -> list[Result]:
    results: list[Result] = []
    css = _all_css_with_override(doc)
    js = _all_script(doc)

    # RDM-01: prefers-reduced-motion in CSS
    if 'prefers-reduced-motion' in css:
        results.append(Result("RDM-01", "PASS", "prefers-reduced-motion media query found in CSS", 0))
    else:
        results.append(Result("RDM-01", "FAIL", "No prefers-reduced-motion media query in CSS", 0))

    # RDM-02: prefersReduced variable in script
    if 'prefersReduced' in js:
        results.append(Result("RDM-02", "PASS", "prefersReduced variable found in script", 0))
    else:
        results.append(Result("RDM-02", "FAIL", "No prefersReduced variable in script", 0))

    # RDM-03: Reduced motion check near confetti
    if 'confetti' in js.lower():
        if 'prefersReduced' in js and 'confetti' in js.lower():
            results.append(Result("RDM-03", "PASS", "Reduced motion guard for confetti found", 0))
        else:
            results.append(Result("RDM-03", "FAIL", "Confetti function missing reduced motion check", 0))
    else:
        results.append(Result("RDM-03", "PASS", "No confetti feature (auto-pass)", 0))

    # RDM-04: Reduced motion check near sound functions
    has_sound = 'playClickSound' in js or 'playSuccessSound' in js
    if has_sound:
        if 'prefersReduced' in js:
            results.append(Result("RDM-04", "PASS", "Sound functions respect reduced motion preference", 0))
        else:
            results.append(Result("RDM-04", "FAIL", "Sound functions missing reduced motion check", 0))
    else:
        results.append(Result("RDM-04", "PASS", "No sound functions (auto-pass)", 0))

    # RDM-05: .confetti display:none must be INSIDE a reduced-motion block
    if 'confetti' not in js.lower() and '.confetti' not in css:
        results.append(Result("RDM-05", "PASS", "No confetti feature (auto-pass)", 0))
    elif re.search(r'\.confetti[^{}]*\{[^}]*display\s*:\s*none', _reduced_motion_blocks(css)):
        results.append(Result("RDM-05", "PASS", "Confetti hidden in reduced motion mode", 0))
    else:
        results.append(Result("RDM-05", "FAIL", "Confetti not hidden in prefers-reduced-motion block", 0))

    # RDM-06: Reduced motion check near startViewTransition
    if 'startViewTransition' in js:
        if 'prefersReduced' in js:
            results.append(Result("RDM-06", "PASS", "View transitions respect reduced motion", 0))
        else:
            results.append(Result("RDM-06", "FAIL", "View transitions missing reduced motion check", 0))
    else:
        results.append(Result("RDM-06", "PASS", "No view transitions (auto-pass)", 0))

    return results


# ---------------------------------------------------------------------------
# Reporter
# ---------------------------------------------------------------------------
def report(results: list[Result], caption_grace: bool = False) -> int:
    if caption_grace:
        results = [
            Result(r.rule_id, "WARN", r.message, r.line)
            if r.rule_id == "ACC-07" and r.status == "FAIL"
            else r
            for r in results
        ]

    results.sort(key=lambda r: r.rule_id)

    pass_count = sum(1 for r in results if r.status == "PASS")
    warn_count = sum(1 for r in results if r.status == "WARN")
    fail_count = sum(1 for r in results if r.status == "FAIL")

    print(f"SPOKES Lesson Validator {SPEC_VERSION}")
    print("=" * 60)

    for r in results:
        line_info = f" — line {r.line}" if r.line > 0 else ""
        print(f"[{r.status}] {r.rule_id}  {r.message}{line_info}")

    print("=" * 60)
    print(f"SUMMARY: {pass_count} PASS | {warn_count} WARN | {fail_count} FAIL (CRITICAL)")

    return 1 if fail_count > 0 else 0


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(description="SPOKES lesson quality validator")
    parser.add_argument("file", help="Path to lesson index.html")
    parser.add_argument("--caption-grace", action="store_true",
                        help="Downgrade A11Y-07 from CRITICAL to WARN")
    args = parser.parse_args()

    filepath = Path(args.file)
    if not filepath.exists():
        print(f"ERROR: File not found: {filepath}", file=sys.stderr)
        sys.exit(2)

    html_content = filepath.read_text(encoding="utf-8")
    doc = parse_document(html_content)
    doc.source_path = filepath

    results: list[Result] = []
    for check_fn in [check_colors, check_typography, check_accessibility,
                     check_components, check_navigation, check_theme,
                     check_mobile, check_performance, check_references, check_engagement,
                     check_reduced_motion]:
        results.extend(check_fn(doc))

    exit_code = report(results, caption_grace=args.caption_grace)
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
