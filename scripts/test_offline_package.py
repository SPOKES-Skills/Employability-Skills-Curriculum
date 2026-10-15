"""Tests for build-offline-package.py, the teachers' offline lessons copy."""
import base64
import re
import shutil
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

BUILDER = Path(__file__).parent / "build-offline-package.py"
DATE = "2026-10-15"
PACKAGE = f"SPOKES-Lessons-Offline-{DATE}"
VTT = "WEBVTT\n\n00:00.000 --> 00:01.000\nHello from the captions\n"

LESSON_HTML = """<!DOCTYPE html>
<html lang="en"><head><title>Alpha</title>
<style>@font-face { font-family: A; src: url("../fonts/a.woff2") format("woff2"); }</style>
</head><body>
<video controls><source src="videos/clip.mp4" type="video/mp4">
<track kind="captions" src="videos/clip.vtt" srclang="en" label="English"></video>
<a href="Handouts/sheet.pdf">Handout</a>
<script src="print/manifest.js"></script>
<script src="../scripts/print-slides.js"></script>
</body></html>
"""

DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="en"><head><title>Dashboard</title>
<style>@font-face { font-family: A; src: url("fonts/a.woff2"); }</style>
</head><body>
<img src="SPOKES-Logo.png" alt="SPOKES logo">
<a class="bespoke-link" href="bespoke/index.html">Open Bespoke</a>
<ul>
    <li><a href="bespoke/index.html">Bespoke (instructor design wizard)</a></li>
    <li><a href="lesson-alpha/index.html">Alpha</a></li>
</ul>
</body></html>
"""

REGISTRY = """{"lessons": [
  {"id": "lesson-alpha", "path": "lesson-alpha/index.html", "status": "ready"},
  {"id": "lesson-beta", "path": "lesson-beta/index.html", "status": "draft"}
]}
"""

TRACKED = {
    "lesson-registry.json": REGISTRY,
    "Dashboard.html": DASHBOARD_HTML,
    "SPOKES-Logo.png": "png",
    "fonts/a.woff2": "font",
    "scripts/print-slides.js": "// print",
    "scripts/print-planner.js": "// planner",
    "scripts/build-tool.py": "# not for teachers",
    "bespoke/index.html": "<html></html>",
    "lesson-alpha/index.html": LESSON_HTML,
    "lesson-alpha/videos/clip.mp4": "mp4",
    "lesson-alpha/videos/clip.vtt": VTT,
    "lesson-alpha/print/manifest.js": 'window.PRINT = [{"src": "print/s01.jpg"}];',
    "lesson-alpha/print/s01.jpg": "jpg",
    "lesson-alpha/Handouts/sheet.pdf": "pdf",
    "lesson-alpha/Teacher-Resources/guide.pdf": "pdf",
    "lesson-alpha/Source Material/raw.docx": "raw",
    "lesson-alpha/.gitignore": "*.tmp",
    "lesson-alpha/.hidden/notes.txt": "local tool state",
    "lesson-beta/index.html": "<html lang='en'></html>",
}


def make_repo(root, overrides=None):
    """Write the fixture files under root and stage them in a new git repo."""
    files = {**TRACKED, **(overrides or {})}
    for rel, text in files.items():
        path = root / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    subprocess.run(["git", "init", "-q"], cwd=root, check=True)
    subprocess.run(["git", "add", "-A"], cwd=root, check=True)
    (root / "lesson-alpha" / "untracked.txt").write_text("local only")


def run_builder(root, out, *extra):
    cmd = [sys.executable, str(BUILDER), "--root", str(root), "--out", str(out), "--date", DATE, *extra]
    return subprocess.run(cmd, capture_output=True, text=True, timeout=60)


class OfflinePackageBuild(unittest.TestCase):
    """A clean fixture builds into one dated folder plus a zip."""

    @classmethod
    def setUpClass(cls):
        cls.tmp = Path(tempfile.mkdtemp())
        cls.repo = cls.tmp / "repo"
        cls.repo.mkdir()
        make_repo(cls.repo)
        cls.out = cls.tmp / "dist"
        cls.result = run_builder(cls.repo, cls.out)
        cls.package = cls.out / PACKAGE
        cls.files = cls.package / "lesson-files"

    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(cls.tmp)

    def test_build_succeeds(self):
        self.assertEqual(self.result.returncode, 0, self.result.stdout + self.result.stderr)

    def test_copies_released_lesson_with_its_resources(self):
        for rel in (
            "lesson-alpha/index.html",
            "lesson-alpha/videos/clip.mp4",
            "lesson-alpha/print/s01.jpg",
            "lesson-alpha/Handouts/sheet.pdf",
            "lesson-alpha/Teacher-Resources/guide.pdf",
        ):
            self.assertTrue((self.files / rel).is_file(), rel)

    def test_copies_shared_files_the_pages_use(self):
        for rel in ("Dashboard.html", "SPOKES-Logo.png", "fonts/a.woff2", "scripts/print-slides.js", "scripts/print-planner.js"):
            self.assertTrue((self.files / rel).is_file(), rel)

    def test_leaves_out_drafts_tools_and_local_files(self):
        self.assertTrue((self.files / "lesson-alpha").is_dir(), "the package must exist for this check to mean anything")
        for rel in (
            "lesson-beta",
            "bespoke",
            "scripts/build-tool.py",
            "lesson-registry.json",
            "lesson-alpha/Source Material",
            "lesson-alpha/.gitignore",
            "lesson-alpha/.hidden",
            "lesson-alpha/untracked.txt",
        ):
            self.assertFalse((self.files / rel).exists(), rel)

    def test_embeds_captions_in_the_lesson_page(self):
        html = (self.files / "lesson-alpha/index.html").read_text(encoding="utf-8")
        self.assertNotIn('src="videos/clip.vtt"', html)
        match = re.search(r'<track\b[^>]*\bsrc="data:text/vtt;base64,([^"]+)"', html)
        self.assertIsNotNone(match, "caption track should carry a data: URI")
        self.assertEqual(base64.b64decode(match.group(1)).decode("utf-8"), VTT)

    def test_removes_bespoke_links_from_dashboard(self):
        html = (self.files / "Dashboard.html").read_text(encoding="utf-8")
        self.assertNotIn("bespoke/", html)
        self.assertIn('href="lesson-alpha/index.html"', html)

    def test_start_here_opens_the_dashboard_and_names_the_date(self):
        html = (self.package / "START HERE.html").read_text(encoding="utf-8")
        self.assertIn('href="lesson-files/Dashboard.html"', html)
        self.assertIn("October 15, 2026", html)

    def test_zip_holds_one_top_folder(self):
        with zipfile.ZipFile(self.out / f"{PACKAGE}.zip") as archive:
            names = archive.namelist()
            self.assertIn(f"{PACKAGE}/START HERE.html", names)
            self.assertIn(f"{PACKAGE}/lesson-files/lesson-alpha/index.html", names)
            self.assertTrue(all(name.startswith(f"{PACKAGE}/") for name in names))

    def test_zip_stores_media_without_recompressing(self):
        with zipfile.ZipFile(self.out / f"{PACKAGE}.zip") as archive:
            video = archive.getinfo(f"{PACKAGE}/lesson-files/lesson-alpha/videos/clip.mp4")
            page = archive.getinfo(f"{PACKAGE}/lesson-files/lesson-alpha/index.html")
            self.assertEqual(video.compress_type, zipfile.ZIP_STORED)
            self.assertEqual(page.compress_type, zipfile.ZIP_DEFLATED)


class OfflinePackageFailures(unittest.TestCase):
    """The build stops, naming the file, when the copy would be broken."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.repo = self.tmp / "repo"
        self.repo.mkdir()
        self.out = self.tmp / "dist"

    def tearDown(self):
        shutil.rmtree(self.tmp)

    def test_missing_caption_file_fails(self):
        html = LESSON_HTML.replace("videos/clip.vtt", "videos/gone.vtt")
        make_repo(self.repo, {"lesson-alpha/index.html": html})
        result = run_builder(self.repo, self.out)
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("videos/gone.vtt", result.stderr)

    def test_link_to_a_file_outside_the_copy_fails(self):
        html = LESSON_HTML.replace("Handouts/sheet.pdf", "Source Material/raw.docx")
        make_repo(self.repo, {"lesson-alpha/index.html": html})
        result = run_builder(self.repo, self.out)
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("Source Material/raw.docx", result.stderr)

    def test_missing_print_picture_fails(self):
        manifest = 'window.PRINT = [{"src": "print/s02.jpg"}];'
        make_repo(self.repo, {"lesson-alpha/print/manifest.js": manifest})
        result = run_builder(self.repo, self.out)
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("print/s02.jpg", result.stderr)

    def test_path_too_long_for_windows_extract_fails(self):
        long_name = f"lesson-alpha/Teacher-Resources/{'a' * 150}.pdf"
        make_repo(self.repo, {long_name: "pdf"})
        result = run_builder(self.repo, self.out)
        self.assertEqual(result.returncode, 1, result.stdout + result.stderr)
        self.assertIn("a" * 150, result.stderr)

    def test_rebuild_replaces_the_previous_copy(self):
        make_repo(self.repo)
        self.assertEqual(run_builder(self.repo, self.out, "--no-zip").returncode, 0)
        stale = self.out / PACKAGE / "lesson-files" / "stale.txt"
        stale.write_text("old")
        self.assertEqual(run_builder(self.repo, self.out, "--no-zip").returncode, 0)
        self.assertFalse(stale.exists())
        self.assertFalse((self.out / f"{PACKAGE}.zip").exists())


if __name__ == "__main__":
    unittest.main()
