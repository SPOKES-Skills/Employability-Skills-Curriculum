#!/usr/bin/env python3
"""Build the offline copy of the lessons that teachers put on a flash drive.

Copies the released lessons (status "ready" in lesson-registry.json) and the
shared files their pages load into one dated folder, then zips it:

    dist/SPOKES-Lessons-Offline-YYYY-MM-DD/
        START HERE.html      opens lesson-files/Dashboard.html
        lesson-files/        Dashboard, logo, fonts, print scripts, lessons
    dist/SPOKES-Lessons-Offline-YYYY-MM-DD.zip

Only git-tracked files are copied. "Source Material" folders and dot files
stay out. Two edits make the copy work when opened from a local file:
  - each caption track's .vtt file is embedded in the page as a data: URI,
    because Chrome and Edge refuse to load caption files on file:// pages;
  - the Dashboard's BeSpoke links are removed, since BeSpoke is not copied.
The build then checks that every link in the copied pages and every picture in
each print manifest resolves inside the copy, and that no path is too long for
Windows' Extract All. A failed check deletes the copy.

Run scripts/check-offline-package.mjs on the folder to open it in a browser.

Exit codes: 0 = built, 1 = the copy would be broken, 2 = bad input.
"""
from __future__ import annotations

import argparse
import base64
import datetime
import json
import re
import shutil
import subprocess
import sys
import zipfile
from html import escape
from pathlib import Path
from urllib.parse import unquote

REPO_ROOT = Path(__file__).resolve().parent.parent
PACKAGE_PREFIX = "SPOKES-Lessons-Offline-"
FILES_DIR = "lesson-files"
START_PAGE = "START HERE.html"
SHARED_PATHS = (
    "Dashboard.html",
    "SPOKES-Logo.png",
    "fonts",
    "scripts/print-slides.js",
    "scripts/print-planner.js",
)
EXCLUDED_FOLDER = "Source Material"
# Windows Extract All fails past 260 characters. A zip path of 190 leaves room
# for C:\Users\<name>\Downloads\ plus the zip's own folder name, which Extract
# All adds on top of the folder inside the zip.
MAX_ZIP_PATH = 190
ALREADY_COMPRESSED = {".mp4", ".jpg", ".jpeg", ".png", ".webp", ".wdp", ".pdf", ".pptx", ".docx", ".woff2"}

REFERENCE = re.compile(r"""(?:\bsrc|\bhref|\bposter|\bdata-src)\s*=\s*["']([^"'#?]*)|url\(\s*["']?([^"')#?]*)""")
NOT_A_FILE = re.compile(r"^(?:[a-z][a-z0-9+.-]*:|//|\$\{)", re.IGNORECASE)
CAPTION_TRACK = re.compile(r'(<track\b[^>]*?\bsrc=")([^"]+)(")')
PRINT_PICTURE = re.compile(r"""["']([^"']+\.(?:jpg|jpeg|png|webp))["']""")
BESPOKE_ITEM = re.compile(r'[ \t]*<li>\s*<a\b[^>]*\bhref="bespoke/[^"]*"[^>]*>.*?</a>\s*</li>[ \t]*\n?', re.DOTALL)
BESPOKE_LINK = re.compile(r'[ \t]*<a\b[^>]*\bhref="bespoke/[^"]*"[^>]*>.*?</a>[ \t]*\n?', re.DOTALL)


class InputError(Exception):
    """The repo cannot be read: no registry, no released lessons, git failed."""


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--root", type=Path, default=REPO_ROOT, help="repo to package (default: this repo)")
    parser.add_argument("--out", type=Path, help="output folder (default: <root>/dist)")
    parser.add_argument(
        "--date",
        type=datetime.date.fromisoformat,
        default=datetime.date.today(),
        help="date in the folder name and on START HERE, YYYY-MM-DD (default: today)",
    )
    parser.add_argument("--no-zip", action="store_true", help="build the folder only")
    return parser.parse_args(argv)


def git(root: Path, *args: str) -> str:
    result = subprocess.run(["git", "-C", str(root), *args], capture_output=True, text=True)
    if result.returncode != 0:
        raise InputError(f"git {' '.join(args)} failed: {result.stderr.strip()}")
    return result.stdout


def ready_lessons(root: Path) -> list[str]:
    """Folder names of the lessons the registry marks ready."""
    try:
        registry = json.loads((root / "lesson-registry.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise InputError(f"cannot read lesson-registry.json: {error}") from error
    folders = [
        Path(entry["path"]).parent.as_posix()
        for entry in registry.get("lessons", [])
        if entry.get("status") == "ready"
    ]
    if not folders:
        raise InputError("lesson-registry.json has no lessons with status ready")
    return folders


def belongs_in_copy(rel: str) -> bool:
    parts = rel.split("/")
    return EXCLUDED_FOLDER not in parts and not any(part.startswith(".") for part in parts)


def select_files(root: Path, lessons: list[str]) -> list[str]:
    listed = git(root, "ls-files", "-z", "--", *lessons, *SHARED_PATHS).split("\0")
    return sorted(rel for rel in listed if rel and belongs_in_copy(rel))


def copy_files(root: Path, files: list[str], dest: Path) -> None:
    for rel in files:
        target = dest / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(root / rel, target)


def embed_captions(page: Path) -> list[str]:
    """Swap each <track src="x.vtt"> for a data: URI. Returns problems found."""
    problems: list[str] = []

    def to_data_uri(match: re.Match[str]) -> str:
        src = match.group(2)
        if src.startswith("data:"):
            return match.group(0)
        vtt = page.parent / unquote(src)
        if not vtt.is_file():
            problems.append(f"{page.parent.name}/{page.name}: caption file {src} not found")
            return match.group(0)
        encoded = base64.b64encode(vtt.read_bytes()).decode("ascii")
        return f"{match.group(1)}data:text/vtt;base64,{encoded}{match.group(3)}"

    html = page.read_text(encoding="utf-8")
    page.write_text(CAPTION_TRACK.sub(to_data_uri, html), encoding="utf-8")
    return problems


def strip_bespoke_links(page: Path) -> None:
    html = page.read_text(encoding="utf-8")
    page.write_text(BESPOKE_LINK.sub("", BESPOKE_ITEM.sub("", html)), encoding="utf-8")


def format_date(day: datetime.date) -> str:
    return f"{day:%B} {day.day}, {day.year}"


def write_start_page(package: Path, built: datetime.date, commit: str) -> None:
    template = (Path(__file__).parent / "offline-start-here.html").read_text(encoding="utf-8")
    html = template.replace("{{BUILT}}", escape(format_date(built))).replace("{{COMMIT}}", escape(commit))
    (package / START_PAGE).write_text(html, encoding="utf-8")


def broken_references(package: Path, pages: list[Path]) -> list[str]:
    """Links in the pages that do not resolve to a file inside the package."""
    problems = []
    for page in pages:
        html = page.read_text(encoding="utf-8")
        for match in REFERENCE.finditer(html):
            ref = (match.group(1) or match.group(2) or "").strip()
            if not ref or NOT_A_FILE.match(ref):
                continue
            target = (page.parent / unquote(ref)).resolve()
            if package not in target.parents or not target.is_file():
                problems.append(f"{page.relative_to(package).as_posix()}: links to {ref}, which is not in the copy")
    return problems


def missing_print_pictures(lesson_dirs: list[Path]) -> list[str]:
    problems = []
    for lesson in lesson_dirs:
        manifest = lesson / "print" / "manifest.js"
        if not manifest.is_file():
            continue
        for picture in PRINT_PICTURE.findall(manifest.read_text(encoding="utf-8")):
            if not (lesson / picture).is_file():
                problems.append(f"{lesson.name}/print/manifest.js: picture {picture} is not in the copy")
    return problems


def overlong_paths(package: Path) -> list[str]:
    paths = (f"{package.name}/{path.relative_to(package).as_posix()}" for path in package.rglob("*") if path.is_file())
    return [
        f"path is {len(p)} characters, over {MAX_ZIP_PATH} for Windows Extract All: {p}"
        for p in paths
        if len(p) > MAX_ZIP_PATH
    ]


def zip_package(package: Path, zip_path: Path) -> None:
    with zipfile.ZipFile(zip_path, "w") as archive:
        for path in sorted(p for p in package.rglob("*") if p.is_file()):
            method = zipfile.ZIP_STORED if path.suffix.lower() in ALREADY_COMPRESSED else zipfile.ZIP_DEFLATED
            archive.write(path, f"{package.name}/{path.relative_to(package).as_posix()}", compress_type=method)


def build(root: Path, out: Path, built: datetime.date, make_zip: bool) -> list[str]:
    """Build the package. Returns problems; an empty list means success."""
    lessons = ready_lessons(root)
    files = select_files(root, lessons)
    package = out / f"{PACKAGE_PREFIX}{built.isoformat()}"
    zip_path = package.with_name(f"{package.name}.zip")
    shutil.rmtree(package, ignore_errors=True)
    zip_path.unlink(missing_ok=True)

    files_root = package / FILES_DIR
    copy_files(root, files, files_root)
    lesson_dirs = [files_root / lesson for lesson in lessons]
    lesson_pages = [lesson / "index.html" for lesson in lesson_dirs]
    problems = [problem for page in lesson_pages for problem in embed_captions(page)]
    strip_bespoke_links(files_root / "Dashboard.html")
    commit = subprocess.run(["git", "-C", str(root), "rev-parse", "--short", "HEAD"], capture_output=True, text=True)
    write_start_page(package, built, commit.stdout.strip() or "uncommitted")

    pages = [package / START_PAGE, files_root / "Dashboard.html", *lesson_pages]
    problems += broken_references(package.resolve(), [page.resolve() for page in pages])
    problems += missing_print_pictures(lesson_dirs)
    problems += overlong_paths(package)
    if problems:
        shutil.rmtree(package)
        return problems
    if make_zip:
        zip_package(package, zip_path)
    size_mb = sum(p.stat().st_size for p in package.rglob("*") if p.is_file()) / 1_048_576
    print(f"Built {package} ({len(lessons)} lessons, {len(files) + 1} files, {size_mb:.0f} MB)")
    if make_zip:
        print(f"Zipped {zip_path} ({zip_path.stat().st_size / 1_048_576:.0f} MB)")
    return []


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    root = args.root.resolve()
    try:
        problems = build(root, (args.out or root / "dist").resolve(), args.date, not args.no_zip)
    except InputError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 2
    for problem in problems:
        print(f"BROKEN: {problem}", file=sys.stderr)
    if problems:
        print(f"Offline copy not built: {len(problems)} problem(s).", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
