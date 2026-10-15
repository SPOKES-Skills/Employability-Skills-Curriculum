#!/usr/bin/env python3
"""Verify a downloaded/checked-out immutable review package before review."""
import argparse
import hashlib
import json
from pathlib import Path
from bespoke_support import selection_digest, require_valid_selection


def verify_package(folder):
    folder = Path(folder)
    manifest = json.loads((folder / "review-package.json").read_text())
    selection = json.loads((folder / "selection.json").read_text())
    require_valid_selection(selection)
    digest = selection_digest(selection)
    if not isinstance(manifest, dict) or manifest.get("chosenOption") != selection.get("alternatives", {}).get("active") or manifest.get("schema") != "bespoke-review-package/v1" or manifest.get("selectionSha256") != digest or manifest.get("submissionId") != f"{selection['date']}-{digest[:16]}":
        raise ValueError("Review manifest does not identify the submitted selection")
    required = ["selection.json", "design.css", "build-contract.json"]
    if selection["schema"] == "bespoke-selection/v2":
        required += ["component-samples.html", "review.html"]
    for name in required:
        if hashlib.sha256((folder / name).read_bytes()).hexdigest() != manifest.get("files", {}).get(name):
            raise ValueError("Review artifact differs from manifest: " + name)
    contract = json.loads((folder / "build-contract.json").read_text())
    if contract.get("selectionSha256") != digest:
        raise ValueError("Build contract refers to another selection")
    if selection["schema"] == "bespoke-selection/v2" and contract.get("design") != selection["design"]:
        raise ValueError("Build contract differs from chosen design")
    return {"submissionId": manifest["submissionId"], "selectionSha256": digest,
            "chosenOption": selection.get("alternatives", {}).get("active"),
            "visualArtifact": str(folder / "review.html") if selection["schema"] == "bespoke-selection/v2" else None,
            "contrastAdvisories": contract.get("contrastAdvisories", []),
            "status": "Package integrity verified; review and approval are separate."}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", type=Path)
    args = parser.parse_args()
    try:
        print(json.dumps(verify_package(args.folder), indent=2))
    except (ValueError, OSError) as exc:
        parser.exit(1, str(exc) + "\n")
