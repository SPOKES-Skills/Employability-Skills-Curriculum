"""V2 intake/artifact boundary checks using only synthetic temporary proposals."""
from copy import deepcopy
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from bespoke_support import require_valid_selection, selection_digest
from bespoke_design import build_design, component_sample_html


def module(filename):
    spec = importlib.util.spec_from_file_location(filename.replace("-", "_"), ROOT / "scripts" / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


writer = module("bespoke-write-submission.py")
apply = module("bespoke-apply-selection.py")
checker = module("bespoke-check-design.py")


class V2SubmissionTests(unittest.TestCase):
    def setUp(self):
        self.catalog = json.loads((ROOT / "bespoke/builder-catalog.json").read_text())
        self.legacy = json.loads((ROOT / "scripts/test-fixtures/bespoke/selection-money-management.json").read_text())
        self.payload = {
            "schema": "bespoke-selection/v2", "date": "2026-09-24", "submittedAt": "2026-09-24T16:30:00.000Z",
            "lesson": deepcopy(self.legacy["lesson"]), "team": deepcopy(self.legacy["team"]),
            "design": deepcopy(self.catalog["defaults"]), "legacySelection": deepcopy(self.legacy),
        }

    def test_full_model_and_legacy_recovery_survive_immutable_proposal(self):
        self.payload["design"]["samples"]["boxes"][3] = "Hidden but recoverable 🎓 <script>alert(1)</script>"
        self.payload["design"]["slides"]["cards"]["count"] = "1"
        self.payload["design"]["fonts"] = {"heading": "outfit", "body": "merriweather"}
        with tempfile.TemporaryDirectory() as tmp:
            destination = writer.write_submission(self.payload, Path(tmp))
            (Path(tmp) / "fonts").symlink_to(ROOT / "fonts")
            (Path(tmp) / "bespoke").mkdir()
            selection = json.loads((destination / "selection.json").read_text())
            contract = json.loads((destination / "build-contract.json").read_text())
            self.assertEqual(selection, self.payload)
            self.assertEqual(contract["design"], self.payload["design"])
            self.assertEqual(contract["selectionSha256"], selection_digest(self.payload))
            self.assertEqual(contract["schema"], "bespoke-build-contract/v2")
            self.assertEqual(checker.check_design(contract, destination / "component-samples.html"), [])
            text = (destination / "content-intake.md").read_text()
            self.assertIn("Original v1 selection preserved verbatim", text)
            self.assertIn("Hidden but recoverable", text)
            self.assertNotIn("<script>", (destination / "component-samples.html").read_text())
            (destination / "content-intake.md").write_text("Instructor edits")
            self.assertEqual(writer.write_submission(self.payload, Path(tmp)), destination)
            self.assertEqual((destination / "content-intake.md").read_text(), "Instructor edits")

    def test_structural_contract_checks_real_cards_title_and_list_elements(self):
        for count in ("1", "2", "3", "4"):
            for title_bar in (True, False):
                for treatment in ("paragraph", "bullets", "numbered"):
                    with self.subTest(count=count, title_bar=title_bar, treatment=treatment):
                        self.payload["design"]["slides"]["cards"].update(count=count, titleBar=title_bar, treatment=treatment)
                        css, contract = build_design(self.payload)
                        parsed = checker.Deck()
                        parsed.feed(component_sample_html(css, contract))
                        self.assertEqual(checker.check_components(contract, parsed), [])
                        cards = contract["componentMarkup"]["cards"]
                        self.assertEqual(cards.count('class="slide-card bespoke-box"'), int(count))
                        # Removing an actual box must fail even with untouched CSS and data-count.
                        broken = checker.Deck()
                        broken.feed(component_sample_html(css, contract).replace('class="slide-card bespoke-box"', 'class="slide-card"', 1))
                        self.assertIn("cards: actual text box count differs from the saved design", checker.check_components(contract, broken))

    def test_catalog_choices_are_in_contract_and_sample_data_attributes(self):
        for group in self.catalog["slideGroups"]:
            for decision in group["decisions"]:
                self.payload["design"]["slides"][group["id"]][decision["id"]] = decision["options"][-1]["id"]
        css, contract = build_design(self.payload)
        self.assertEqual(contract["design"], self.payload["design"])
        parsed = checker.Deck()
        parsed.feed(component_sample_html(css, contract))
        self.assertEqual(checker.check_components(contract, parsed), [])
        contract["componentRequirements"]["title"]["attributes"]["data-layout"] = "not-the-selected-layout"
        self.assertIn("title: data-layout differs from the saved design", checker.check_components(contract, parsed))

    def test_invalid_v2_and_legacy_cannot_write_files(self):
        changes = [
            lambda p: p["design"]["roles"].update(body="not-a-brand-color"),
            lambda p: p["design"]["fonts"].update(heading="made-up-font"),
            lambda p: p["design"]["samples"]["boxes"].append("fifth"),
            lambda p: p["legacySelection"]["theme"].update(colorLead="off-brand"),
        ]
        for change in changes:
            with self.subTest(change=change), tempfile.TemporaryDirectory() as tmp:
                selection = deepcopy(self.payload)
                change(selection)
                with self.assertRaises(ValueError):
                    writer.write_submission(selection, Path(tmp))
                self.assertEqual(list(Path(tmp).iterdir()), [])

    def test_low_contrast_choices_generate_exact_artifacts_with_nonblocking_advisories(self):
        self.payload["design"]["roles"].update(titleBackground="mauve", titleBackgroundEnd="accent", titleText="light", subtitle="light", dividerBackground="accent", heading="accent", body="gold")
        self.payload["design"]["background"] = "plain"
        original = deepcopy(self.payload)
        validator = module("validate-bespoke-selection.py")
        errors, warnings = validator.validate_payload(self.payload, {})
        self.assertEqual(errors, [])
        self.assertTrue(any("2.66:1" in warning for warning in warnings))
        with tempfile.TemporaryDirectory() as tmp:
            destination = writer.write_submission(self.payload, Path(tmp))
            (Path(tmp) / "fonts").symlink_to(ROOT / "fonts")
            (Path(tmp) / "bespoke").mkdir()
            contract = json.loads((destination / "build-contract.json").read_text())
            self.assertEqual(contract["design"], original["design"])
            self.assertEqual(contract["contrastAdvisories"], warnings)
            self.assertEqual(json.loads((destination / "selection.json").read_text()), original)
            self.assertEqual(checker.check_design(contract, destination / "component-samples.html"), [])
            self.assertIn("The team leader can keep this choice", (destination / "component-samples.html").read_text())
            self.assertIn("--role-body: var(--gold)", (destination / "design.css").read_text())
            self.assertEqual(self.payload, original)

    def test_sidebar_text_and_builder_reach_the_build_contract(self):
        preset = next(item for item in self.catalog["presets"] if item["id"] == "professional")
        self.payload["design"] = deepcopy(preset["design"])
        self.payload["design"]["roles"]["sidebarText"] = "gold"
        self.payload["team"]["builder"] = {"name": "Dana Builder"}
        require_valid_selection(self.payload)
        css, contract = build_design(self.payload)
        self.assertEqual(contract["design"]["roles"]["sidebarText"], "gold")
        self.assertRegex(css, r"--role-sidebar-ink:\s*var\(--gold\)")

    def test_legacy_registry_cannot_silently_flatten_v2_design(self):
        themes, lessons = {"lessons": {}}, {"lessons": []}
        before = deepcopy((themes, lessons))
        with self.assertRaisesRegex(ValueError, "legacy theme registry cannot represent"):
            apply.apply_selection(self.payload, theme_registry=themes, lesson_registry=lessons)
        self.assertEqual((themes, lessons), before)


if __name__ == "__main__":
    unittest.main()
