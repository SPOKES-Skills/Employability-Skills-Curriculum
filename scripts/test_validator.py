"""Tests for validate-lesson.py — SPOKES lesson quality validator."""
import unittest
import subprocess
import sys
from pathlib import Path

VALIDATOR = Path(__file__).parent / "validate-lesson.py"
FIXTURES = Path(__file__).parent / "test-fixtures"


def run_validator(fixture_name, extra_args=None):
    """Run the validator on a fixture file and return (exit_code, stdout, stderr)."""
    cmd = [sys.executable, str(VALIDATOR), str(FIXTURES / fixture_name)]
    if extra_args:
        cmd.extend(extra_args)
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
    return result.returncode, result.stdout, result.stderr


class TestValidatorPassingFixture(unittest.TestCase):
    """minimal-pass.html should pass all rules."""

    def test_exit_code_zero(self):
        code, stdout, _ = run_validator("minimal-pass.html")
        self.assertEqual(code, 0, f"Expected exit 0, got {code}.\n{stdout}")

    def test_no_fail_lines(self):
        _, stdout, _ = run_validator("minimal-pass.html")
        fail_lines = [l for l in stdout.splitlines() if l.startswith("[FAIL]")]
        self.assertEqual(len(fail_lines), 0, f"Unexpected FAILs:\n" + "\n".join(fail_lines))

    def test_summary_line_exists(self):
        _, stdout, _ = run_validator("minimal-pass.html")
        self.assertIn("SUMMARY:", stdout)


class TestValidatorFailingFixture(unittest.TestCase):
    """minimal-fail.html should fail specific CRITICAL rules."""

    def test_exit_code_nonzero(self):
        code, stdout, _ = run_validator("minimal-fail.html")
        self.assertNotEqual(code, 0, f"Expected non-zero exit.\n{stdout}")

    def test_clr03_catches_rogue_color(self):
        _, stdout, _ = run_validator("minimal-fail.html")
        fail_lines = [l for l in stdout.splitlines() if "CLR-03" in l and "FAIL" in l]
        self.assertGreater(len(fail_lines), 0, "CLR-03 should FAIL for #c9a74a")

    def test_clr05_catches_gold_text(self):
        _, stdout, _ = run_validator("minimal-fail.html")
        fail_lines = [l for l in stdout.splitlines() if "CLR-05" in l and "FAIL" in l]
        self.assertGreater(len(fail_lines), 0, "CLR-05 should FAIL for var(--gold)")

    def test_a11y04_catches_missing_skip_link(self):
        _, stdout, _ = run_validator("minimal-fail.html")
        fail_lines = [l for l in stdout.splitlines() if "A11Y-04" in l and "FAIL" in l]
        self.assertGreater(len(fail_lines), 0, "A11Y-04 should FAIL for missing skip link")

    def test_a11y05_catches_missing_announcer(self):
        _, stdout, _ = run_validator("minimal-fail.html")
        fail_lines = [l for l in stdout.splitlines() if "A11Y-05" in l and "FAIL" in l]
        self.assertGreater(len(fail_lines), 0, "A11Y-05 should FAIL for missing announcer")

    def test_a11y07_catches_missing_captions(self):
        _, stdout, _ = run_validator("minimal-fail.html")
        fail_lines = [l for l in stdout.splitlines() if "A11Y-07" in l and "FAIL" in l]
        self.assertGreater(len(fail_lines), 0, "A11Y-07 should FAIL for missing captions")

    def test_a11y09_catches_span_nav(self):
        _, stdout, _ = run_validator("minimal-fail.html")
        fail_lines = [l for l in stdout.splitlines() if "A11Y-09" in l and "FAIL" in l]
        self.assertGreater(len(fail_lines), 0, "A11Y-09 should FAIL for span nav buttons")

    def test_a11y13_catches_missing_lang(self):
        _, stdout, _ = run_validator("minimal-fail.html")
        fail_lines = [l for l in stdout.splitlines() if "A11Y-13" in l and "FAIL" in l]
        self.assertGreater(len(fail_lines), 0, "A11Y-13 should FAIL for missing lang")

    def test_mob02_catches_small_toggle(self):
        _, stdout, _ = run_validator("minimal-fail.html")
        fail_lines = [l for l in stdout.splitlines() if "MOB-02" in l and "FAIL" in l]
        self.assertGreater(len(fail_lines), 0, "MOB-02 should FAIL for 36x36px toggle")

    def test_typ02_catches_root_font_override(self):
        _, stdout, _ = run_validator("minimal-fail.html")
        fail_lines = [l for l in stdout.splitlines() if "TYP-02" in l and "FAIL" in l]
        self.assertGreater(len(fail_lines), 0, "TYP-02 should FAIL for font override in :root")

    def test_nav06_catches_missing_session_storage(self):
        _, stdout, _ = run_validator("minimal-fail.html")
        fail_lines = [l for l in stdout.splitlines() if "NAV-06" in l and "FAIL" in l]
        self.assertGreater(len(fail_lines), 0, "NAV-06 should FAIL for missing sessionStorage")


class TestValidatorEdgeCases(unittest.TestCase):
    """Edge cases documented in the spec."""

    def test_nonexistent_file_exits_with_error(self):
        code, _, stderr = run_validator("nonexistent.html")
        self.assertNotEqual(code, 0)

    def test_caption_grace_flag(self):
        """With --caption-grace, A11Y-07 should be WARN not FAIL."""
        _, stdout, _ = run_validator("minimal-fail.html", ["--caption-grace"])
        a11y07_lines = [l for l in stdout.splitlines() if "A11Y-07" in l]
        self.assertGreater(len(a11y07_lines), 0, "A11Y-07 should still appear")
        self.assertIn("WARN", a11y07_lines[0], "A11Y-07 should be WARN with --caption-grace")
        self.assertNotIn("FAIL", a11y07_lines[0], "A11Y-07 should NOT be FAIL with --caption-grace")


class TestValidatorLocalReferences(unittest.TestCase):
    """Local asset/link references should resolve relative to the lesson file."""

    def _load_mod(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "validate_lesson", Path(__file__).parent / "validate-lesson.py"
        )
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod

    def test_ref01_fails_for_missing_local_href(self):
        mod = self._load_mod()
        doc = mod.parse_document("""<!DOCTYPE html>
<html lang="en">
<body>
  <a href="Handouts/Missing.pdf">Missing handout</a>
</body>
</html>""")
        doc.source_path = Path(__file__).parent / "tmp-lesson" / "index.html"

        results = [r for r in mod.check_references(doc) if r.rule_id == "REF-01"]

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].status, "FAIL")
        self.assertIn("Handouts/Missing.pdf", results[0].message)

    def test_ref01_passes_for_existing_local_href_and_fragment(self):
        mod = self._load_mod()
        doc = mod.parse_document("""<!DOCTYPE html>
<html lang="en">
<body>
  <a href="minimal-pass.html#mainContent">Existing fixture</a>
  <img src="test.png" alt="Decorative test">
  <a href="#mainContent">Skip</a>
</body>
</html>""")
        doc.source_path = FIXTURES / "minimal-pass.html"

        results = [r for r in mod.check_references(doc) if r.rule_id == "REF-01"]

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].status, "PASS")

    def test_ref02_fails_for_blank_target_without_noopener(self):
        mod = self._load_mod()
        doc = mod.parse_document("""<!DOCTYPE html>
<html lang="en">
<body>
  <a href="minimal-pass.html" target="_blank">Unsafe blank target</a>
</body>
</html>""")
        doc.source_path = FIXTURES / "minimal-pass.html"

        results = [r for r in mod.check_references(doc) if r.rule_id == "REF-02"]

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].status, "FAIL")
        self.assertIn("target=\"_blank\"", results[0].message)

    def test_ref02_passes_for_blank_target_with_noopener_and_noreferrer(self):
        mod = self._load_mod()
        doc = mod.parse_document("""<!DOCTYPE html>
<html lang="en">
<body>
  <a href="minimal-pass.html" target="_blank" rel="noopener noreferrer">Safe blank target</a>
</body>
</html>""")
        doc.source_path = FIXTURES / "minimal-pass.html"

        results = [r for r in mod.check_references(doc) if r.rule_id == "REF-02"]

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].status, "PASS")


class TestValidatorFalseNegativeFixes(unittest.TestCase):
    """Regression tests for the 3 false-negative gaps closed in VAL-CR1/CR2/CR3."""

    def test_a11y07_catches_unbalanced_tracks(self):
        """VAL-CR1: 2 videos where both caption tracks nest inside video 1 should FAIL A11Y-07."""
        _, stdout, _ = run_validator("minimal-fail.html")
        fail_lines = [l for l in stdout.splitlines() if "A11Y-07" in l and "FAIL" in l]
        self.assertGreater(
            len(fail_lines), 0,
            "A11Y-07 should FAIL when one video has 2 tracks and the other has none"
        )

    def test_clr05_catches_grouped_selector(self):
        """VAL-CR2: CSS '.gold, .highlight { color: var(--gold); }' should FAIL CLR-05."""
        _, stdout, _ = run_validator("minimal-fail.html")
        fail_lines = [l for l in stdout.splitlines() if "CLR-05" in l and "FAIL" in l]
        self.assertGreater(
            len(fail_lines), 0,
            "CLR-05 should FAIL for comma-grouped selector .gold, .highlight { color: var(--gold); }"
        )

    def test_clr02_catches_inline_style_hex(self):
        """VAL-CR3: inline style='color: #dc2626' should FAIL CLR-02."""
        _, stdout, _ = run_validator("minimal-fail.html")
        fail_lines = [l for l in stdout.splitlines() if "CLR-02" in l and "FAIL" in l]
        self.assertGreater(
            len(fail_lines), 0,
            "CLR-02 should FAIL for non-canonical hex in inline style= attribute"
        )


class TestValidatorOutput(unittest.TestCase):
    """Output format matches spec."""

    def test_output_format_pass(self):
        _, stdout, _ = run_validator("minimal-pass.html")
        lines = [l for l in stdout.splitlines() if l.startswith("[")]
        for line in lines:
            self.assertRegex(line, r"^\[(PASS|WARN|FAIL)\]\s+[A-Z]+-\d+")

    def test_summary_contains_counts(self):
        _, stdout, _ = run_validator("minimal-pass.html")
        summary_lines = [l for l in stdout.splitlines() if "SUMMARY:" in l]
        self.assertGreater(len(summary_lines), 0, "SUMMARY line required")
        self.assertRegex(summary_lines[0], r"PASS.*WARN.*FAIL")

    def test_version_in_output(self):
        _, stdout, _ = run_validator("minimal-pass.html")
        self.assertIn("v1.0", stdout)


class TestCLR05Boundaries(unittest.TestCase):
    """Regression tests for CLR-05 class and property boundary fixes (Fixer-VAL-2)."""

    def _run_check_on_css(self, css_fragment: str) -> list:
        """Return CLR-05 results for a minimal HTML doc containing the given CSS."""
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "validate_lesson", Path(__file__).parent / "validate-lesson.py"
        )
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        parse_document = mod.parse_document
        check_colors = mod.check_colors

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Test</title>
<style>
:root {{
  --primary: #007baf;
  --accent: #37b550;
  --dark: #004071;
  --light: #ffffff;
  --muted: #edf3f7;
  --gray: #60636b;
  --gold: #d3b257;
  --royal: #00133f;
  --mauve: #a7253f;
  --offwhite: #d1d3d4;
  --muted-gold: #ad8806;
  --font-heading: "DM Serif Display", serif;
  --font-body: "Outfit", sans-serif;
}}
{css_fragment}
</style>
</head>
<body></body>
</html>"""
        doc = parse_document(html)
        return [r for r in check_colors(doc) if r.rule_id == "CLR-05"]

    def test_clr05_ignores_gold_border_class(self):
        """CLR-05 must PASS for .card.gold-border {{ border-left-color: var(--gold); }}."""
        css = ".card.gold-border { border-left-color: var(--gold); }"
        results = self._run_check_on_css(css)
        self.assertEqual(len(results), 1)
        self.assertEqual(
            results[0].status, "PASS",
            "CLR-05 should PASS: .gold-border is not .gold, and border-left-color is not color"
        )

    def test_clr05_ignores_gold_card_descendant_background(self):
        """.area-card.gold-card .area-icon {{ background-color: var(--gold); }} must PASS CLR-05."""
        css = ".area-card.gold-card .area-icon { background-color: var(--gold); }"
        results = self._run_check_on_css(css)
        self.assertEqual(len(results), 1)
        self.assertEqual(
            results[0].status, "PASS",
            "CLR-05 should PASS: background-color is not color"
        )

    def test_clr05_still_catches_plain_gold_selector(self):
        """.gold {{ color: var(--gold); }} must still FAIL CLR-05."""
        css = ".gold { color: var(--gold); }"
        results = self._run_check_on_css(css)
        self.assertEqual(len(results), 1)
        self.assertEqual(
            results[0].status, "FAIL",
            "CLR-05 should FAIL: .gold with color: var(--gold)"
        )

    def test_clr05_still_catches_comma_grouped_gold_selector(self):
        """.gold, .highlight {{ color: var(--gold); }} must still FAIL CLR-05."""
        css = ".gold, .highlight { color: var(--gold); }"
        results = self._run_check_on_css(css)
        self.assertEqual(len(results), 1)
        self.assertEqual(
            results[0].status, "FAIL",
            "CLR-05 should FAIL: comma-grouped .gold, .highlight with color: var(--gold)"
        )


class TestCLR07ProximityCheck(unittest.TestCase):
    """Regression tests for CLR-07 proximity-constrained confetti hex check (Fixer-VAL-H)."""

    def _load_mod(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "validate_lesson", Path(__file__).parent / "validate-lesson.py"
        )
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod

    def _run_clr07(self, js_fragment: str) -> str:
        """Return the CLR-07 status for a minimal HTML doc with the given JS."""
        mod = self._load_mod()
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Test</title>
<style>
:root {{
  --primary: #007baf; --accent: #37b550; --dark: #004071; --light: #ffffff;
  --muted: #edf3f7; --gray: #60636b; --gold: #d3b257; --royal: #00133f;
  --mauve: #a7253f; --offwhite: #d1d3d4; --muted-gold: #ad8806;
  --font-heading: "DM Serif Display", serif; --font-body: "Outfit", sans-serif;
}}
</style>
</head>
<body>
<script>
{js_fragment}
</script>
</body>
</html>"""
        doc = mod.parse_document(html)
        results = mod.check_colors(doc)
        clr07 = [r for r in results if r.rule_id == "CLR-07"]
        self.assertEqual(len(clr07), 1, "CLR-07 result should always be emitted")
        return clr07[0].status

    def test_clr07_catches_confetti_with_nearby_hex(self):
        """CLR-07 must WARN when a hex literal appears within the confetti function body."""
        js = "function triggerConfetti() { const colors = ['#ff0000', '#00ff00']; }"
        status = self._run_clr07(js)
        self.assertEqual(
            status, "WARN",
            "CLR-07 should WARN: hex literals are within 200 chars of 'confetti'"
        )

    def test_clr07_ignores_distant_hex(self):
        """CLR-07 must PASS when the hex literal is 500+ chars away from 'confetti'."""
        # The two functions are separated by a long comment (>200 chars, no hex in between).
        separator = "// " + ("x" * 500)
        js = f"function triggerConfetti() {{ doSomething(); }}\n{separator}\nfunction quiz() {{ const answers = ['#abc']; }}"
        status = self._run_clr07(js)
        self.assertEqual(
            status, "PASS",
            "CLR-07 should PASS: '#abc' is more than 200 chars away from 'confetti'"
        )

    def test_clr07_catches_existing_pattern(self):
        """CLR-07 must still WARN for the canonical bad pattern: confetti called with colors array."""
        js = "confetti({ colors: ['#e63946', '#457b9d', '#a8dadc'] });"
        status = self._run_clr07(js)
        self.assertEqual(
            status, "WARN",
            "CLR-07 should WARN: hex literals inside confetti() call"
        )


class TestBlindSpotRegressions(unittest.TestCase):
    """Regression tests for auto-pass blind spots fixed 2026-08-03."""

    def _load_mod(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "validate_lesson", Path(__file__).parent / "validate-lesson.py"
        )
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod

    def _result(self, results, rule_id):
        return next(r for r in results if r.rule_id == rule_id)

    def test_thm05_sees_dark_theme_in_theme_override(self):
        """THM-05 must not auto-pass when .theme-dark CSS lives only in theme-override."""
        mod = self._load_mod()
        doc = mod.parse_document(
            '<html><head><style>body{}</style>'
            '<style id="theme-override">.theme-dark .slide{color:#ffffff}</style></head>'
            '<body><main class="main theme-dark"></main></body></html>'
        )
        r = self._result(mod.check_theme(doc), "THM-05")
        self.assertEqual(r.status, "PASS")
        self.assertNotIn("auto-pass", r.message)

    def test_thm05_fails_when_main_lacks_dark_class(self):
        mod = self._load_mod()
        doc = mod.parse_document(
            '<html><head><style id="theme-override">.theme-dark .slide{color:#ffffff}</style></head>'
            '<body><main class="main"></main></body></html>'
        )
        r = self._result(mod.check_theme(doc), "THM-05")
        self.assertEqual(r.status, "FAIL")

    def test_cmp01_flags_qa_tab_btn(self):
        mod = self._load_mod()
        doc = mod.parse_document('<html><body><button class="qa-tab-btn">x</button></body></html>')
        r = self._result(mod.check_components(doc), "CMP-01")
        self.assertEqual(r.status, "WARN")

    def test_cmp02_flags_qa_accordion(self):
        mod = self._load_mod()
        doc = mod.parse_document('<html><body><div class="qa-accordion-item">x</div></body></html>')
        r = self._result(mod.check_components(doc), "CMP-02")
        self.assertEqual(r.status, "WARN")

    def test_nav08_warns_on_unguarded_confetti(self):
        mod = self._load_mod()
        doc = mod.parse_document(
            '<html><body><script>function triggerConfetti(){}</script></body></html>'
        )
        r = self._result(mod.check_navigation(doc), "NAV-08")
        self.assertEqual(r.status, "WARN")

    def test_nav11_warns_on_tab_markup_without_switchtab(self):
        mod = self._load_mod()
        doc = mod.parse_document(
            '<html><body><button role="tab">t</button><script>const x=1;</script></body></html>'
        )
        r = self._result(mod.check_navigation(doc), "NAV-11")
        self.assertEqual(r.status, "WARN")

    def test_a11y01_detects_tabs_by_role_markup(self):
        """A11Y-01 must not auto-pass when tabs use variant classes but role markup exists."""
        mod = self._load_mod()
        doc = mod.parse_document(
            '<html><body><div role="tablist">'
            '<button class="qa-tab-btn" role="tab">t</button></div></body></html>'
        )
        r = self._result(mod.check_accessibility(doc), "ACC-01")
        self.assertEqual(r.status, "FAIL")  # role markup found, ARIA incomplete

    def test_a11y07_fails_on_cueless_vtt(self):
        import tempfile
        mod = self._load_mod()
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            (tmp_path / "empty.vtt").write_text("WEBVTT\n", encoding="utf-8")
            doc = mod.parse_document(
                '<html><body><video preload="none" aria-label="v">'
                '<track kind="captions" src="empty.vtt" srclang="en"></video></body></html>'
            )
            doc.source_path = tmp_path / "index.html"
            r = self._result(mod.check_accessibility(doc), "ACC-07")
            self.assertEqual(r.status, "FAIL")
            self.assertIn("no cues", r.message)


class TestTYP05SelfHostedFonts(unittest.TestCase):
    """TYP-05: fonts must be self-hosted via @font-face with font-display: swap."""

    def _load_mod(self):
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "validate_lesson", Path(__file__).parent / "validate-lesson.py"
        )
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod

    def _typ05(self, mod, html):
        doc = mod.parse_document(html)
        results = [r for r in mod.check_typography(doc) if r.rule_id == "TYP-05"]
        self.assertEqual(len(results), 1)
        return results[0]

    def test_warns_on_google_fonts_link(self):
        mod = self._load_mod()
        r = self._typ05(mod, """<!DOCTYPE html>
<html lang="en"><head>
  <link href="https://fonts.googleapis.com/css2?family=Outfit&display=swap" rel="stylesheet">
</head><body></body></html>""")
        self.assertEqual(r.status, "WARN")
        self.assertIn("self-hosted", r.message)

    def test_passes_on_font_face_with_swap(self):
        mod = self._load_mod()
        r = self._typ05(mod, """<!DOCTYPE html>
<html lang="en"><head><style>
  @font-face { font-family: "Outfit"; src: url("../fonts/outfit-latin.woff2") format("woff2"); font-weight: 300 800; font-display: swap; }
</style></head><body></body></html>""")
        self.assertEqual(r.status, "PASS")

    def test_warns_on_font_face_missing_swap(self):
        mod = self._load_mod()
        r = self._typ05(mod, """<!DOCTYPE html>
<html lang="en"><head><style>
  @font-face { font-family: "Outfit"; src: url("../fonts/outfit-latin.woff2") format("woff2"); font-weight: 300 800; }
</style></head><body></body></html>""")
        self.assertEqual(r.status, "WARN")
        self.assertIn("font-display", r.message)

    def test_warns_when_no_fonts_declared(self):
        mod = self._load_mod()
        r = self._typ05(mod, """<!DOCTYPE html>
<html lang="en"><head><style>body { color: #000; }</style></head><body></body></html>""")
        self.assertEqual(r.status, "WARN")
        self.assertIn("No self-hosted @font-face", r.message)


if __name__ == "__main__":
    unittest.main()
