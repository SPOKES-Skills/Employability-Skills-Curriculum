"""Regression checks for malformed intake, immutable proposals, and design handoff."""
from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from bespoke_support import require_valid_selection
from bespoke_design import build_design


def module(filename):
    spec = importlib.util.spec_from_file_location(filename.replace("-", "_"), ROOT / "scripts" / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


writer = module("bespoke-write-submission.py")
apply = module("bespoke-apply-selection.py")
checker = module("bespoke-check-design.py")


class SubmissionTests(unittest.TestCase):
    def setUp(self):
        self.payload = json.loads((ROOT / "scripts/test-fixtures/bespoke/selection-money-management.json").read_text())

    def test_malformed_shapes_fail_without_attribute_errors(self):
        for field in ("theme", "team", "lesson"):
            for value in (None, "invalid", [], 4):
                payload = deepcopy(self.payload)
                payload[field] = value
                with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                    require_valid_selection(payload)
        for value in (None, [], "invalid"):
            with self.assertRaises(ValueError):
                require_valid_selection(value)

    def test_invalid_inputs_cannot_write_any_submission(self):
        for field, value in (("lesson", {"id": "../../escape", "title": "X"}), ("date", "2026-02-30"), ("date", "../../elsewhere")):
            payload = deepcopy(self.payload)
            payload[field] = value
            with tempfile.TemporaryDirectory() as tmp:
                with self.assertRaises(ValueError):
                    writer.write_submission(payload, Path(tmp))
                self.assertEqual(list(Path(tmp).iterdir()), [])

    def test_unknown_lesson_and_blank_spokesperson_rejected(self):
        for kind in ("lesson", "name"):
            payload = deepcopy(self.payload)
            if kind == "lesson":
                payload["lesson"]["id"] = "time-management"
            else:
                payload["team"]["spokesperson"]["name"] = " \n "
            with self.assertRaises(ValueError):
                require_valid_selection(payload)

    def test_design_brief_is_validated_and_shown_in_the_proposal(self):
        payload = deepcopy(self.payload)
        payload["brief"] = {"feel": "welcoming", "room": "active", "fresh": "fresh", "light": "dark", "variant": "2"}
        require_valid_selection(payload)
        text = writer.build_intake_markdown(payload, payload["date"])
        self.assertIn("| Design brief | feel welcoming, class active, closeness fresh, slides dark, version 2 |", text)
        self.assertNotIn("Design brief", writer.build_intake_markdown(self.payload, self.payload["date"]))
        for key, value in (("feel", "cheerful"), ("variant", 2), ("variant", "12345"), ("extra", "x")):
            bad = deepcopy(payload)
            bad["brief"][key] = value
            with self.subTest(key=key, value=value), self.assertRaises(ValueError):
                require_valid_selection(bad)

    def test_proposal_names_the_builder_and_falls_back_to_the_team_leader(self):
        payload = deepcopy(self.payload)
        leader = payload["team"]["spokesperson"]["name"]
        fallback = writer.build_intake_markdown(payload, "2026-10-02")
        row = next(line for line in fallback.splitlines() if "Design built by" in line)
        self.assertIn(leader, row)
        payload["team"]["builder"] = {"name": "Dana Builder"}
        named = writer.build_intake_markdown(payload, "2026-10-02")
        row = next(line for line in named.splitlines() if "Design built by" in line)
        self.assertIn("Dana Builder", row)

    def test_all_six_presets_produce_accepted_design_contracts(self):
        catalog = json.loads((ROOT / "bespoke/catalog.json").read_text())
        for preset in catalog["presets"]:
            payload = deepcopy(self.payload)
            payload["presetId"] = preset["id"]
            for field, value in preset["defaults"].items():
                if field == "cardStyle":
                    payload["theme"]["cards"] = {"lessonWide": value, "varyByChapter": False, "chapterStyles": None}
                else:
                    payload["theme"][field] = value
            with self.subTest(preset=preset["id"]):
                css, contract = build_design(payload)
                self.assertTrue(css)
                self.assertEqual(contract["theme"]["fontPairing"], preset["defaults"]["fontPairing"])

    def test_blocked_library_options_cannot_enter_submissions(self):
        for field, value in (("dividerStyle", "split-panel"), ("cards", "gradient-fill")):
            payload = deepcopy(self.payload)
            if field == "cards":
                payload["theme"]["cards"]["chapterStyles"]["P1"] = value
            else:
                payload["theme"][field] = value
            with self.subTest(field=field), self.assertRaises(ValueError):
                require_valid_selection(payload)

    def test_explicit_chapter_variation_rejects_conflict(self):
        self.payload["theme"]["cards"]["chapterStyles"]["I"] = "left-border"
        with self.assertRaisesRegex(ValueError, "THM-04"):
            require_valid_selection(self.payload)

    def test_same_day_proposals_and_idempotent_retry_preserve_intake(self):
        with tempfile.TemporaryDirectory() as tmp:
            first = writer.write_submission(self.payload, Path(tmp))
            text = "Teacher completed the intake."
            (first / "content-intake.md").write_text(text)
            self.assertEqual(writer.write_submission(self.payload, Path(tmp)), first)
            self.assertEqual((first / "content-intake.md").read_text(), text)
            second_payload = deepcopy(self.payload)
            second_payload["team"]["name"] = "Second team"
            second = writer.write_submission(second_payload, Path(tmp))
            self.assertNotEqual(first, second)
            self.assertEqual(json.loads((first / "selection.json").read_text()), self.payload)
            self.assertTrue((second / "design.css").is_file())
            self.assertTrue((second / "build-contract.json").is_file())

    def test_canonical_stages_retained_samples_not_promoted_to_curriculum(self):
        self.payload["sampleContent"]["bullets"] = "Preview only\n```\n# Do not promote"
        self.payload["team"]["name"] = "Team | another cell\nNext row"
        text = writer.build_intake_markdown(self.payload, self.payload["date"])
        for stage in ("W", "I", "P1", "P2", "P3", "E", "A"):
            self.assertIn("### Stage " + stage + " --", text)
        self.assertNotIn("Preview only", text.split("## Bespoke design proposal")[0])
        self.assertIn("````text\nPreview only\n```", text)
        self.assertIn("Team &#124; another cell<br>Next row", text)

    def test_registry_apply_rejects_existing_release_without_mutation(self):
        themes = {"lessons": {"lesson-money-management": {"old": True}}}
        lessons = {"lessons": [{"id": "lesson-money-management", "status": "ready", "slides": 30}]}
        before = deepcopy((themes, lessons))
        with self.assertRaisesRegex(ValueError, "existing lesson release"):
            apply.apply_selection(self.payload, theme_registry=themes, lesson_registry=lessons)
        self.assertEqual((themes, lessons), before)

    def test_stale_pending_registry_update_requires_current_digest(self):
        themes, lessons, key = apply.apply_selection(self.payload, theme_registry={}, lesson_registry={})
        updated = deepcopy(self.payload)
        updated["theme"]["colorLead"] = "mauve"
        with self.assertRaisesRegex(ValueError, "Pending design changed"):
            apply.apply_selection(updated, theme_registry=themes, lesson_registry=lessons)
        with self.assertRaisesRegex(ValueError, "Pending design changed"):
            apply.apply_selection(updated, theme_registry=themes, lesson_registry=lessons, expected_previous="stale")
        revised, _, _ = apply.apply_selection(updated, theme_registry=themes, lesson_registry=lessons,
                                             expected_previous=themes["lessons"][key]["bespokeSelectionSha256"])
        self.assertEqual(revised["lessons"][key]["colorLead"], "mauve")
        self.assertEqual(themes["lessons"][key]["colorLead"], "blue")

    def test_registry_apply_rejects_invalid_theme(self):
        self.payload["theme"]["colorLead"] = "off-brand"
        with self.assertRaises(ValueError):
            apply.apply_selection(self.payload, theme_registry={}, lesson_registry={})

    def test_generated_css_preserves_selected_families_and_chapter_mapping(self):
        self.payload["theme"].update(sidebarColor="royal", backgroundTexture="plain", dividerStyle="framed-gold")
        css, contract = build_design(self.payload)
        self.assertIn('.sidebar { background: var(--royal); }', css)
        self.assertIn('.main { background: var(--light); }', css)
        self.assertIn('[data-chapter="3"] .card', css)
        self.assertIn('.slide-section[data-chapter="7"]', css)
        self.assertIn("--font-heading: 'DM Serif Display'", css)
        self.assertIn(".matrix-cell .matrix-action", css)
        self.assertIn(".slide-section .chapter-label", css)
        self.assertIn(".slide-section::after", css)
        self.assertGreaterEqual(len(contract["fontSelectors"]["heading"]), 12)
        self.assertNotIn("SCOPE", css)
        self.assertNotIn("Default background.", css)
        self.assertEqual(contract["chapterMap"]["P1"], "3")

    def test_final_design_checker_detects_wrong_theme_chapters_and_fonts(self):
        css, contract = build_design(self.payload)
        dividers = ''.join(f'<section class="slide-section" data-chapter="{n}" data-chapter-num="{key}"></section>' for key, n in contract["chapterMap"].items())
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            lesson = base / "lesson-money-management"
            lesson.mkdir()
            for relative in contract["fontPaths"]:
                font = (lesson / relative).resolve()
                font.parent.mkdir(exist_ok=True)
                font.write_bytes(b"synthetic existence fixture")
            html = lesson / "index.html"
            valid = f'<meta name="bespoke-selection-sha256" content="{contract["selectionSha256"]}"><style>body {{}}</style><style id="theme-override">{css}</style>{dividers}'
            html.write_text(valid)
            self.assertEqual(checker.check_design(contract, html), [])
            html.write_text(valid.replace('data-chapter-num="P1"', 'data-chapter-num="P4"').replace('background: var(--dark)', 'background: pink'))
            errors = checker.check_design(contract, html)
            self.assertTrue(any("theme-override differs" in e for e in errors))
            self.assertTrue(any("P1" in e for e in errors))
            (lesson / contract["fontPaths"][0]).unlink()
            self.assertTrue(any("Missing font" in e for e in checker.check_design(contract, html)))


if __name__ == "__main__":
    unittest.main()
