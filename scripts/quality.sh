#!/usr/bin/env bash
# The quality gate for this repo. CI runs this and fails the build when it
# exits non-zero; run it locally before sharing anything.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> SPOKES validator: all lesson decks"
for lesson in lesson-*/index.html; do
  echo "--- $lesson"
  python3 scripts/validate-lesson.py "$lesson"
done

echo "==> SPOKES validator: canonical builder template"
python3 scripts/validate-lesson.py "SPOKES Builder/template.html"

echo "==> validator test suite"
python3 -m unittest discover -s scripts -p 'test_validator.py' -v

echo "==> registry / dashboard fallback sync"
python3 scripts/check-registry-sync.py

echo "==> print slides pictures current"
node scripts/capture-print-slides.mjs --check

echo "==> bespoke selection schema (generate --check + fixtures + submissions)"
python3 scripts/generate-selection-schema.py --check
node scripts/generate-selection-v2-schema.mjs --check
node scripts/test-bespoke-builder-model.mjs
node scripts/test-bespoke-role-model.mjs
node scripts/test-bespoke-role-contracts.mjs
node scripts/test-bespoke-similarity.mjs
python3 -m unittest discover -s scripts -p 'test_bespoke*.py' -v
echo "==> bespoke handoff endpoint"
node --test scripts/test-bespoke-dev-server.mjs scripts/test-bespoke-v2-contracts.mjs scripts/test-bespoke-handoff.mjs scripts/test-bespoke-provision.mjs scripts/test-bespoke-brief.mjs scripts/test-bespoke-guide.mjs scripts/test-print-slides.mjs scripts/test-print-slides-lib.mjs
# Valid fixtures + any docs/phase-2/submissions/**/selection.json (skips *invalid*/*broken*)
python3 scripts/validate-bespoke-selection.py \
  scripts/test-fixtures/bespoke/selection-money-management.json
if [ -d docs/phase-2/submissions ]; then
  # macOS ships Bash 3.2, which does not provide mapfile/readarray.
  SUBMISSION_SELECTIONS=()
  while IFS= read -r selection; do
    SUBMISSION_SELECTIONS+=("$selection")
  done < <(find docs/phase-2/submissions -type f -name 'selection.json' | sort)
  if [ "${#SUBMISSION_SELECTIONS[@]}" -gt 0 ]; then
    python3 scripts/validate-bespoke-selection.py "${SUBMISSION_SELECTIONS[@]}"
  fi
fi
# Negative fixture must fail
python3 scripts/validate-bespoke-selection.py --expect-fail \
  scripts/test-fixtures/bespoke/selection-invalid-slug.json

# Browser checks share the exact-pinned Playwright + axe harness with the
# lesson accessibility gate. CI installs Chromium; classroom machines do not
# need Node or browser-test dependencies to run the static lessons.
if [ "${CI:-}" = "true" ] && { [ ! -d node_modules/playwright ] || [ ! -d node_modules/axe-core ]; }; then
  npm ci
  npx playwright install --with-deps chromium
fi
if [ -d node_modules/playwright ] && [ -d node_modules/axe-core ]; then
  echo "==> bespoke browser workflow"
  node scripts/test-bespoke-browser.mjs
  node scripts/test-bespoke-builder-browser.mjs
  node scripts/test-bespoke-simple-workflow.mjs
  node scripts/test-bespoke-preview-editor.mjs
  node scripts/test-bespoke-feature-inspector.mjs
  node scripts/test-bespoke-review-tools.mjs
  node scripts/test-bespoke-review-delivery-browser.mjs
  node scripts/test-bespoke-guided-browser.mjs
  node scripts/test-bespoke-workflow-qa.mjs
  node scripts/test-bespoke-streamlined-workflow.mjs
  node scripts/test-bespoke-effective-paint.mjs
  node scripts/test-bespoke-effective-theme.mjs
  node scripts/test-bespoke-contract-qa.mjs
  node scripts/test-bespoke-visual-qa.mjs
  node scripts/test-bespoke-sidebar.mjs
  node scripts/test-bespoke-role-browser.mjs
  node scripts/test-bespoke-role-rendering.mjs
  node scripts/test-bespoke-title-layouts.mjs
  node scripts/test-bespoke-video-frames.mjs
  node scripts/test-bespoke-patterns.mjs
  node scripts/generate-lesson-fingerprints.mjs --check
  echo "==> print slides dialog and lesson printouts"
  node --test scripts/test-print-slides-browser.mjs scripts/test-print-slides-lessons.mjs
  echo "==> theme library title-slide layouts"
  node scripts/check-title-layouts.mjs
  if [ -f scripts/test-bespoke-design.mjs ]; then
    echo "==> bespoke generated-design browser checks"
    node scripts/test-bespoke-design.mjs
  fi
else
  echo "bespoke browser checks SKIPPED: harness deps not installed (npm ci && npx playwright install chromium to enable)"
fi

# REPORT-ONLY: prints per-deck Flesch-Kincaid grades (grade-8 ceiling) and
# always exits 0. Turning this into a blocking check is a later, deliberate
# calibration decision — do not drop --baseline without one.
echo "==> bespoke theme library (generate --check + library sync)"
python3 scripts/generate-theme-library.py --check
python3 scripts/check-library-sync.py

echo "==> readability baseline (report-only)"
node scripts/readability-gate.mjs --baseline --format html \
  --allowlist config/readability-allowlist.json \
  lesson-*/index.html \
  || echo "readability baseline step failed (non-blocking)"

# Computed accessibility (axe-core WCAG A/AA, first slide view of every deck
# over file://). Ratchet: fails only on violations beyond the committed
# shrink-only allowlist scripts/a11y-baseline.json. The Node harness deps
# (devDependencies: playwright + axe-core) are test-only — the decks need
# nothing — so this step is skipped with a note when they are not installed.
# CI installs them; a bare classroom machine does not need them.
echo "==> a11y check (axe-core over lesson decks, ratchet vs committed baseline)"
if [ -d node_modules/playwright ] && [ -d node_modules/axe-core ]; then
  node scripts/a11y-check.mjs
else
  echo "a11y check SKIPPED: harness deps not installed (npm ci && npx playwright install chromium to enable)"
fi

echo "quality.sh: all checks passed"
