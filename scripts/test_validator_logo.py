"""Tests for the logo rules (LOGO-01, LOGO-02) in validate-lesson.py."""
import ast
import base64
import subprocess
import sys
import unittest
from pathlib import Path

from test_validator import OFFICIAL_LOGO, OTHER_IMAGE, VALIDATOR, run_validator_on_lesson


class TestLogoRules(unittest.TestCase):
    LOGO_IMG = '<img src="SPOKES-Logo.png" alt="SPOKES" class="logo" />'

    def test_logo01_passes_with_official_copy(self):
        code, out = run_validator_on_lesson(self.LOGO_IMG, files={"SPOKES-Logo.png": OFFICIAL_LOGO})
        self.assertIn("[PASS] LOGO-01", out)
        self.assertEqual(code, 0, out)

    def test_logo01_fails_when_logo_file_differs(self):
        _, out = run_validator_on_lesson(self.LOGO_IMG, files={"SPOKES-Logo.png": OTHER_IMAGE})
        self.assertIn("[FAIL] LOGO-01", out)

    def test_logo01_fails_when_logo_class_points_at_other_image(self):
        _, out = run_validator_on_lesson('<img src="badge.png" alt="Badge" class="logo" />',
                                         files={"badge.png": OTHER_IMAGE})
        self.assertIn("[FAIL] LOGO-01", out)

    def test_logo01_fails_when_alt_names_spokes_but_image_differs(self):
        _, out = run_validator_on_lesson('<img src="mark.png" alt="SPOKES" />',
                                         files={"mark.png": OTHER_IMAGE})
        self.assertIn("[FAIL] LOGO-01", out)

    def test_logo_rules_ignore_images_that_only_mention_spokes(self):
        code, out = run_validator_on_lesson('<img src="game.png" alt="SPOKES Jeopardy Review Game thumbnail" />',
                                            files={"game.png": OTHER_IMAGE})
        self.assertIn("[PASS] LOGO-01", out)
        self.assertEqual(code, 0, out)

    def test_logo01_checks_css_url_reference(self):
        _, out = run_validator_on_lesson(css_extra=".hero { background-image: url('SPOKES-Logo.png'); }",
                                         files={"SPOKES-Logo.png": OTHER_IMAGE})
        self.assertIn("[FAIL] LOGO-01", out)

    def test_logo01_checks_embedded_data_uri(self):
        data = base64.b64encode(OTHER_IMAGE.read_bytes()).decode("ascii")
        _, out = run_validator_on_lesson(f'<img src="data:image/png;base64,{data}" alt="SPOKES" class="logo" />')
        self.assertIn("[FAIL] LOGO-01", out)

    def test_logo01_resolves_query_string(self):
        _, out = run_validator_on_lesson('<img src="SPOKES-Logo.png?v=2" alt="SPOKES" class="logo" />',
                                         files={"SPOKES-Logo.png": OFFICIAL_LOGO})
        self.assertIn("[PASS] LOGO-01", out)

    def test_logo01_reports_missing_file(self):
        _, out = run_validator_on_lesson(self.LOGO_IMG)
        self.assertRegex(out, r"\[FAIL\] LOGO-01 .*missing")

    def test_logo01_passes_when_no_logo(self):
        code, out = run_validator_on_lesson()
        self.assertIn("[PASS] LOGO-01", out)
        self.assertEqual(code, 0, out)

    def _styled(self, css):
        return run_validator_on_lesson(self.LOGO_IMG, css_extra=css, files={"SPOKES-Logo.png": OFFICIAL_LOGO})

    def test_logo02_fails_on_filter(self):
        self.assertIn("[FAIL] LOGO-02", self._styled(".logo { filter: grayscale(1); }")[1])

    def test_logo02_fails_on_mix_blend_mode(self):
        self.assertIn("[FAIL] LOGO-02", self._styled(".logo { mix-blend-mode: multiply; }")[1])

    def test_logo02_fails_on_clip_path(self):
        self.assertIn("[FAIL] LOGO-02", self._styled(".logo { clip-path: circle(40%); }")[1])

    def test_logo02_fails_on_object_fit_cover(self):
        self.assertIn("[FAIL] LOGO-02", self._styled(".logo { width: 80px; height: 80px; object-fit: cover; }")[1])

    def test_logo02_fails_on_fixed_width_and_height(self):
        self.assertIn("[FAIL] LOGO-02", self._styled(".logo { width: 120px; height: 40px; }")[1])

    def test_logo02_passes_with_object_fit_contain(self):
        code, out = self._styled(".logo { width: 120px; height: 120px; object-fit: contain; }")
        self.assertIn("[PASS] LOGO-02", out)
        self.assertEqual(code, 0, out)

    def test_logo02_passes_with_max_width_only(self):
        code, out = self._styled(".logo { max-width: 150px; max-height: 80px; }")
        self.assertIn("[PASS] LOGO-02", out)
        self.assertEqual(code, 0, out)

    def test_logo02_checks_rules_inside_media_queries(self):
        out = self._styled("@media (max-width: 600px) { .logo { width: 40px; height: 40px; } }")[1]
        self.assertIn("[FAIL] LOGO-02", out)

    def test_logo02_fails_on_inline_style_filter(self):
        _, out = run_validator_on_lesson(
            '<img src="SPOKES-Logo.png" alt="SPOKES" class="logo" style="filter: invert(1)" />',
            files={"SPOKES-Logo.png": OFFICIAL_LOGO})
        self.assertIn("[FAIL] LOGO-02", out)

    def test_logo02_fails_when_logo_is_stand_in_art(self):
        _, out = run_validator_on_lesson('<img src="SPOKES-Logo.png" alt="{{chapter image description}}" />',
                                         files={"SPOKES-Logo.png": OFFICIAL_LOGO})
        self.assertIn("[FAIL] LOGO-02", out)

    def test_logo02_accepts_common_logo_alt_text(self):
        for alt in ("SPOKES logo.", "SPOKES program logo"):
            with self.subTest(alt=alt):
                code, out = run_validator_on_lesson(f'<img src="SPOKES-Logo.png" alt="{alt}" class="corner-brand" />',
                                                    files={"SPOKES-Logo.png": OFFICIAL_LOGO})
                self.assertIn("[PASS] LOGO-02", out)
                self.assertEqual(code, 0, out)

    def test_logo02_accepts_decorative_logo(self):
        code, out = run_validator_on_lesson(
            '<img src="SPOKES-Logo.png" alt="" aria-hidden="true" class="corner-brand" />',
            files={"SPOKES-Logo.png": OFFICIAL_LOGO})
        self.assertIn("[PASS] LOGO-02", out)
        self.assertEqual(code, 0, out)

    def test_logo_rules_allow_text_wordmark(self):
        for markup in ('<p class="spokes-wordmark">SPOKES <span>Skills for Life</span></p>',
                       '<span class="logo-wordmark" aria-label="SPOKES">SPOKES</span>'):
            with self.subTest(markup=markup):
                code, out = run_validator_on_lesson(markup)
                self.assertIn("[PASS] LOGO-01", out)
                self.assertIn("[PASS] LOGO-02", out)
                self.assertEqual(code, 0, out)

    def test_logo02_stand_in_message_says_how_to_mark_the_logo(self):
        _, out = run_validator_on_lesson('<img src="SPOKES-Logo.png" alt="Photo of a job interview" />',
                                         files={"SPOKES-Logo.png": OFFICIAL_LOGO})
        self.assertRegex(out, r'\[FAIL\] LOGO-02 .*stand-in art.*class.*alt="SPOKES logo"')

    # LOGO-02 follows the logo element and its ancestors, not selector text.
    def _wrapped(self, body, css, extra_files=None):
        return run_validator_on_lesson(body, css_extra=css,
                                       files={"SPOKES-Logo.png": OFFICIAL_LOGO, **(extra_files or {})})

    def test_logo02_fails_on_bare_img_filter(self):
        self.assertIn("[FAIL] LOGO-02", self._styled(".slide img, img { filter: grayscale(1) contrast(1.1); }")[1])

    def test_logo02_fails_on_ancestor_scoped_img_filter(self):
        out = self._wrapped(f'<section class="slide slide-title">{self.LOGO_IMG}</section>',
                            ".slide-title img { filter: grayscale(1); }")[1]
        self.assertIn("[FAIL] LOGO-02", out)

    def test_logo02_follows_classes_the_script_adds(self):
        body = (f'<section class="slide slide-closing">{self.LOGO_IMG}</section>'
                '<script>document.querySelector(".slide-closing").classList.add("active");</script>')
        out = self._wrapped(body, ".slide-closing.active img { filter: grayscale(1); }")[1]
        self.assertIn("[FAIL] LOGO-02", out)

    def test_logo02_passes_when_rule_excludes_logo(self):
        code, out = self._wrapped(f'<section class="slide">{self.LOGO_IMG}</section>',
                                  ".slide img:not(.logo) { filter: grayscale(1); }")
        self.assertIn("[PASS] LOGO-02", out)
        self.assertEqual(code, 0, out)

    def test_logo02_passes_on_logo_frame_wrapper(self):
        code, out = self._wrapped(f'<div class="logo-frame">{self.LOGO_IMG}</div>',
                                  ".logo-frame { width: 160px; height: 160px; display: grid; place-items: center; }")
        self.assertIn("[PASS] LOGO-02", out)
        self.assertEqual(code, 0, out)

    def test_logo02_matches_class_tokens_exactly(self):
        code, out = self._wrapped('<img src="SPOKES-Logo.png" alt="SPOKES" class="logo fade" />',
                                  ".fade-panel { width: 300px; height: 200px; }")
        self.assertIn("[PASS] LOGO-02", out)
        self.assertEqual(code, 0, out)

    def test_logo02_ignores_img_rules_scoped_elsewhere(self):
        code, out = self._wrapped(f'<div class="split-image"><img src="photo.png" alt="A photo" /></div>{self.LOGO_IMG}',
                                  ".split-image img { width: 300px; height: 300px; object-fit: cover; }",
                                  {"photo.png": OTHER_IMAGE})
        self.assertIn("[PASS] LOGO-02", out)
        self.assertEqual(code, 0, out)

    def test_logo02_fails_on_painted_logo_stretch(self):
        out = self._wrapped("", ".slide-section::before { background: url('SPOKES-Logo.png') center / 100% 100% no-repeat; }")[1]
        self.assertIn("[FAIL] LOGO-02", out)

    def test_logo02_passes_painted_logo_at_natural_ratio(self):
        code, out = self._wrapped("", ".brand::before { content: ''; background: url('SPOKES-Logo.png') no-repeat center / contain; }")
        self.assertIn("[PASS] LOGO-02", out)
        self.assertEqual(code, 0, out)

    def test_logo02_fails_on_mask_image(self):
        out = self._styled(".logo { -webkit-mask-image: linear-gradient(#000, transparent); "
                           "mask-image: linear-gradient(#000, transparent); }")[1]
        self.assertIn("[FAIL] LOGO-02", out)

    def test_logo02_fails_on_content_swap(self):
        self.assertIn("[FAIL] LOGO-02", self._styled(".logo { content: url('badge.png'); }")[1])

    def test_logo02_fails_on_prefixed_filter(self):
        self.assertIn("[FAIL] LOGO-02", self._styled(".logo { -webkit-filter: invert(1); }")[1])

    # A filter or blend mode on an element around the logo recolors the logo with it.
    def test_logo02_fails_on_wrapper_filter(self):
        out = self._wrapped(f'<div class="logo-wrap">{self.LOGO_IMG}</div>',
                            ".logo-wrap { filter: brightness(0) invert(1); }")[1]
        self.assertIn("[FAIL] LOGO-02", out)

    def test_logo02_fails_on_wrapper_blend_mode(self):
        out = self._wrapped(f'<header class="title-bar">{self.LOGO_IMG}</header>',
                            ".title-bar { mix-blend-mode: screen; }")[1]
        self.assertIn("[FAIL] LOGO-02", out)

    def test_logo02_fails_on_wrapper_filter_the_script_turns_on(self):
        body = (f'<section class="slide">{self.LOGO_IMG}</section>'
                '<script>document.body.classList.toggle("dark");</script>')
        self.assertIn("[FAIL] LOGO-02", self._wrapped(body, "body.dark { filter: invert(1); }")[1])

    def test_logo02_fails_on_wrapper_inline_filter(self):
        out = self._wrapped(f'<div style="filter: grayscale(1)">{self.LOGO_IMG}</div>', "")[1]
        self.assertIn("[FAIL] LOGO-02", out)

    def test_logo02_allows_drop_shadow_on_wrapper(self):
        code, out = self._wrapped(f'<div class="title-card">{self.LOGO_IMG}</div>',
                                  ".title-card { filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3)); }")
        self.assertIn("[PASS] LOGO-02", out)
        self.assertEqual(code, 0, out)

    def test_logo02_ignores_filter_on_containers_without_the_logo(self):
        code, out = self._wrapped(f'<div class="photo-panel"><img src="photo.png" alt="A photo" /></div>{self.LOGO_IMG}',
                                  ".photo-panel { filter: grayscale(1); }", {"photo.png": OTHER_IMAGE})
        self.assertIn("[PASS] LOGO-02", out)
        self.assertEqual(code, 0, out)

    # LOGO-01 follows every way an element can show an image as the logo.
    def test_logo01_checks_srcset_candidates(self):
        out = self._wrapped('<img src="SPOKES-Logo.png" srcset="badge.png 2x" alt="SPOKES" class="logo" />', "",
                            {"badge.png": OTHER_IMAGE})[1]
        self.assertIn("[FAIL] LOGO-01", out)

    def test_logo01_passes_official_srcset(self):
        code, out = self._wrapped('<img src="SPOKES-Logo.png" srcset="SPOKES-Logo.png 1x, SPOKES-Logo.png?v=2 2x" '
                                  'alt="SPOKES" class="logo" />', "")
        self.assertIn("[PASS] LOGO-01", out)
        self.assertEqual(code, 0, out)

    def test_logo01_checks_picture_sources(self):
        out = self._wrapped(f'<picture><source srcset="badge.png" type="image/png" />{self.LOGO_IMG}</picture>', "",
                            {"badge.png": OTHER_IMAGE})[1]
        self.assertIn("[FAIL] LOGO-01", out)

    def test_logo01_checks_inline_style_url(self):
        out = self._wrapped('<div class="brand" style="background-image: url(\'SPOKES-Logo-white.png\')"></div>', "",
                            {"SPOKES-Logo-white.png": OTHER_IMAGE})[1]
        self.assertIn("[FAIL] LOGO-01", out)

    def test_logo01_checks_data_uri_on_logo_class_element(self):
        data = base64.b64encode(OTHER_IMAGE.read_bytes()).decode("ascii")
        out = self._wrapped(f'<div class="logo" style="background-image: url(data:image/png;base64,{data})"></div>', "")[1]
        self.assertIn("[FAIL] LOGO-01", out)

    def test_logo01_checks_data_uri_in_rules_for_logo_elements(self):
        data = base64.b64encode(OTHER_IMAGE.read_bytes()).decode("ascii")
        out = self._wrapped('<div class="corner-logo"></div>',
                            f".corner-logo {{ background-image: url(data:image/png;base64,{data}); }}")[1]
        self.assertIn("[FAIL] LOGO-01", out)

    def test_logo01_fails_on_redrawn_svg_logo(self):
        out = self._wrapped('<svg class="logo" viewBox="0 0 10 10" role="img" aria-label="SPOKES">'
                            '<rect width="10" height="10" /></svg>', "")[1]
        self.assertIn("[FAIL] LOGO-01", out)


RELEASED_LESSONS = ("lesson-communicating-with-the-public", "lesson-controlling-anger",
                    "lesson-employee-accountability", "lesson-interview-skills",
                    "lesson-problem-solving-and-decision-making", "lesson-time-management")


class TestReleasedLessonsLogo(unittest.TestCase):
    def test_released_lessons_pass_logo_rules(self):
        root = Path(__file__).resolve().parent.parent
        for lesson in (root / name / "index.html" for name in RELEASED_LESSONS):
            self.assertTrue(lesson.is_file(), lesson.parent.name)
            out = subprocess.run([sys.executable, str(VALIDATOR), str(lesson)],
                                 capture_output=True, text=True).stdout
            self.assertIn("[PASS] LOGO-01", out, lesson.parent.name)
            self.assertIn("[PASS] LOGO-02", out, lesson.parent.name)

    def test_template_passes_logo_rules(self):
        template = Path(__file__).resolve().parent.parent / "SPOKES Builder" / "template.html"
        out = subprocess.run([sys.executable, str(VALIDATOR), str(template)],
                             capture_output=True, text=True).stdout
        self.assertIn("[PASS] LOGO-01", out)
        self.assertIn("[PASS] LOGO-02", out)
        self.assertNotIn("[FAIL]", out)


class TestCssSelectModule(unittest.TestCase):
    def test_css_select_defers_annotations(self):
        """macOS's built-in Python 3.9 cannot evaluate `str | None`, so the validator must not evaluate it on import."""
        tree = ast.parse((Path(__file__).parent / "css_select.py").read_text(encoding="utf-8"))
        futures = {alias.name for node in tree.body
                   if isinstance(node, ast.ImportFrom) and node.module == "__future__" for alias in node.names}
        self.assertIn("annotations", futures)


if __name__ == "__main__":
    unittest.main()
