"""Deterministic design handoff; never creates lesson content or modifies HTML."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path
import re
from copy import deepcopy

from bespoke_support import ROOT, require_valid_selection, selection_digest
from bespoke_model import model_result

CHAPTERS = ("W", "I", "P1", "P2", "P3", "E", "A")


def sha(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def build_design(payload: dict) -> tuple[str, dict]:
    require_valid_selection(payload)
    if payload.get("schema") == "bespoke-selection/v2":
        return build_design_v2(payload)
    source = (ROOT / "SPOKES Builder/theme-options.json").read_text(encoding="utf-8")
    sections = json.loads(source)["sections"]
    meta = json.loads((ROOT / "bespoke/catalog.json").read_text(encoding="utf-8"))
    theme = payload["theme"]
    pair = next(p for p in meta["fontPairings"] if p["id"] == theme["fontPairing"])
    # Use the same self-hosted face declarations as the instructor preview.
    preview_css = (ROOT / "bespoke/styles.css").read_text(encoding="utf-8")
    faces = [block for block in re.findall(r"@font-face\s*\{[^}]+\}", preview_css)
             if any(f'font-family: "{name}"' in block for name in (pair["heading"], pair["body"]))]
    if not faces or any(not any(f'font-family: "{name}"' in b for b in faces) for name in (pair["heading"], pair["body"])):
        raise ValueError("Selected font pairing is missing its self-hosted font declarations")
    font_paths = re.findall(r'url\("(.*?)"\)', "\n".join(faces))
    for path in font_paths:
        if not (ROOT / "bespoke" / path).is_file():
            raise ValueError(f"Missing font asset: {path}")
    template = (ROOT / "SPOKES Builder/template.html").read_text(encoding="utf-8")
    chunks = [f"/* Bespoke selection SHA-256: {selection_digest(payload)} */", *faces,
              f"body {{ --font-heading: '{pair['heading']}', serif; --font-body: '{pair['body']}', sans-serif; font-family: var(--font-body); }}"]
    # The current skeleton still hardcodes fonts on individual components.
    # Match its selectors exactly so the late override actually wins the cascade.
    template_css = "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", template, re.DOTALL))
    template_css = re.sub(r"/\*.*?\*/", "", template_css, flags=re.DOTALL)
    font_selectors = {"heading": [], "body": []}
    for selectors, declarations in re.findall(r"([^{}]+)\{([^{}]+)\}", template_css):
        for role, original in (("heading", "DM Serif Display"), ("body", "Outfit")):
            if selectors.strip().startswith("@"):
                continue
            named_font = re.search(r"font-family:\s*[\"']" + re.escape(original) + r"[\"']", declarations)
            variable_font = re.search(r"font-family:\s*var\(--font-" + role + r"\)", declarations)
            if named_font or variable_font:
                font_selectors[role].append(selectors.strip())
    for role, selectors in font_selectors.items():
        if not selectors:
            raise ValueError(f"Template {role} font selectors changed; review the generator")
        chunks.append(",\n".join(selectors) + f" {{ font-family: var(--font-{role}); }}")

    def option(family: str, slug: str) -> str:
        for section in sections:
            if (section.get("family") or section["id"]) == family:
                for entry in section.get("options", []):
                    if entry["slug"] == slug:
                        css = entry.get("css", "")
                        if css.startswith("Default background"):
                            raise ValueError("Theme source contains prose in CSS")
                        return css
        raise ValueError(f"No CSS option for {family}.{slug}")

    for family, field in (("colorLeads", "colorLead"), ("sidebarColors", "sidebarColor"),
                          ("backgroundTextures", "backgroundTexture"), ("titleSlides", "titleSlide")):
        chunks.append(option(family, theme[field]))
    for number, chapter in enumerate(CHAPTERS, 1):
        card = theme["cards"]["chapterStyles"][chapter] if theme["cards"]["varyByChapter"] else theme["cards"]["lessonWide"]
        chunks.append(option("cards", card).replace("SCOPE", f'[data-chapter="{number}"]'))
        chunks.append(option("dividers", theme["dividerStyle"]).replace("DIVIDER_SCOPE", f'.slide-section[data-chapter="{number}"]'))
    if theme["backgroundTexture"] == "dark-royal":
        chunks.extend(o["css"] for s in sections if s["id"] == "darkTheme" for o in s["options"])
    css = "\n\n".join(c for c in chunks if c.strip()) + "\n"
    manifest = {
        "schema": "bespoke-build-contract/v1",
        "lessonId": payload["lesson"]["id"],
        "selectionSha256": selection_digest(payload),
        "themeOptionsSha256": sha(source),
        "templateSha256": sha((ROOT / "SPOKES Builder/template.html").read_text(encoding="utf-8")),
        "cssSha256": sha(css),
        "theme": theme,
        "chapterMap": {key: str(i) for i, key in enumerate(CHAPTERS, 1)},
        "fontPairing": pair,
        "fontPaths": font_paths,
        "fontSelectors": font_selectors,
        "mainClassRequired": "theme-dark" if theme["backgroundTexture"] == "dark-royal" else None,
        "acceptance": [
            "Insert design.css verbatim into style#theme-override after base CSS.",
            "Add meta[name=bespoke-selection-sha256] with selectionSha256 as content.",
            "Retain canonical template markup and match chapterMap; do not override chosen theme in later CSS.",
            "Run scripts/bespoke-check-design.py with this contract and the finished HTML.",
            "Run lesson validator and full quality gate; inspect all slides and chosen components in a browser.",
            "Britt and the team review final visual and content fidelity before release. Static checks do not prove appearance.",
        ],
    }
    return css, manifest


def build_design_v2(payload: dict) -> tuple[str, dict]:
    """A complete component contract, never a lossy legacy-theme conversion."""
    result = model_result(payload, "design")
    if result["errors"]:
        raise ValueError("Invalid v2 design: " + "; ".join(result["errors"]))
    css = f"/* Bespoke selection SHA-256: {selection_digest(payload)} */\n" + result["css"].strip() + "\n"
    font_paths = sorted(set(re.findall(r'url\([\"\']?(\.\./fonts/[^\)\"\']+)', css)))
    for font_path in font_paths:
        if not (ROOT / "bespoke" / font_path).is_file():
            raise ValueError(f"Missing font asset: {font_path}")
    if not font_paths:
        raise ValueError("V2 design is missing self-hosted font declarations")
    design = deepcopy(payload["design"])
    manifest = {
        "schema": "bespoke-build-contract/v2",
        "lessonId": payload["lesson"]["id"],
        "selectionSha256": selection_digest(payload),
        "catalogSha256": sha((ROOT / "bespoke/builder-catalog.json").read_text(encoding="utf-8")),
        "modelSha256": sha((ROOT / "bespoke/builder-model.mjs").read_text(encoding="utf-8")),
        "cssSha256": sha(css),
        "design": design,
        "contrastAdvisories": result["warnings"],
        "fonts": result["fonts"],
        "fontPaths": font_paths,
        "componentMarkup": result["markup"],
        "reviewMarkup": result["reviewMarkup"],
        "componentRequirements": {
            kind: {"rootClass": "bespoke-slide", "attributes": {"data-kind": kind, **{
                "data-" + re.sub(r"([A-Z])", lambda match: "-" + match[1].lower(), key): str(value).lower() if isinstance(value, bool) else value
                for key, value in choices.items()
            }}} for kind, choices in design["slides"].items()
        },
        "scope": "Reusable visual slide roles and sample copy only. Not an authored lesson or a release approval.",
        "acceptance": [
            "Use the shared componentMarkup as the structural reference. Replace sample copy only with separately approved instructor content.",
            "Insert design.css verbatim into style#theme-override after base CSS, and add the selection SHA-256 meta tag.",
            "Retain each role's data attributes and structural classes. Cards require the saved number of real text boxes, the saved title-bar presence, and actual paragraph/ul/ol markup; CSS alone cannot implement those choices.",
            "Keep all four sample box strings in selection.json, even when fewer boxes are displayed. Do not treat hidden drafts as deleted content.",
            "Contrast advisories inform the team leader's design decision and do not block this artifact. Preserve the selected colors; do not silently recolor them or treat advisory presence as a failed contract.",
            "Run scripts/bespoke-check-design.py with this contract and the finished HTML; browser review, lesson validation and quality gates remain required.",
            "Legacy registry application is deliberately unsupported. A reviewed v2 registry consumer is required before any separately authorized lesson build uses that registry.",
            "No automatic lesson building, publication or production changes are authorized by this proposal.",
        ],
    }
    return css, manifest


def component_sample_html(css: str, contract: dict, standalone: bool = False) -> str:
    """Reviewable sample artifact located with an immutable submission in the repo."""
    import html
    markup = "\n".join(
        f'<h2>{html.escape(kind.capitalize())} sample</h2>\n{fragment}'
        for kind, fragment in contract.get("reviewMarkup", contract["componentMarkup"]).items()
    )
    base = '<base href="../../../../../bespoke/">'
    if standalone:
        import base64
        # Preserve the exact submitted fonts and logo independently of future repo edits.
        for font_path in contract["fontPaths"]:
            encoded = base64.b64encode((ROOT / "bespoke" / font_path).read_bytes()).decode("ascii")
            css = css.replace(font_path, "data:font/woff2;base64," + encoded)
        logo = base64.b64encode((ROOT / "SPOKES-Logo.png").read_bytes()).decode("ascii")
        markup = markup.replace('../SPOKES-Logo.png', "data:image/png;base64," + logo)
        base = ''
    advisories = contract.get("contrastAdvisories", [])
    guidance = ("<aside class=\"contrast-advisory\" aria-label=\"Contrast advisory\"><h2>Contrast advisory</h2>"
                "<p>Contrast is the difference between text and its background. Low contrast can make text harder to read.</p><ul>"
                + "".join(f"<li>{html.escape(message)}</li>" for message in advisories)
                + "</ul><p>Consider a different text or background color. The team leader can keep this choice.</p></aside>") if advisories else ""
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
{base}
<meta name="bespoke-selection-sha256" content="{contract['selectionSha256']}">
<title>BeSpoke reusable visual samples</title>
<style>body{{margin:0;padding:2rem;background:#edf3f7;color:#00133f;font-family:system-ui}}main{{max-width:1100px;margin:auto}}h2{{margin-top:2rem}}.contrast-advisory{{padding:1rem;background:#fff4f0;color:#6d2434;font:1rem/1.5 system-ui}}.contrast-advisory h2{{margin-top:0}}</style>
<style id="theme-override">{css}</style></head><body><main>
<h1>Reusable visual samples</h1><p>Sample text only. This design proposal does not build or publish a lesson.</p>
{guidance}
{markup}
</main></body></html>\n'''
