# Review tools and delivery audit — October 7, 2026

This local change keeps the approved presets and feature inspector. No lessons,
production drafts, credentials, external submissions, pushes or deployments are
part of this work. Britt chose **confirmed delivery; review when requested**.
No schedule, automatic review, notification or message integration was added.

## Team workflow

- **Present** opens the current design without editor controls. Previous/Next,
  the slide menu and arrow keys navigate the five reusable slide types. Full
  screen uses the browser API when available; the window-filling presentation
  remains usable otherwise. Back to editing and Escape restore the editor and
  focus without changing design, selection, history or saved data.
- **Try another version** preserves A and starts editing B. Compare shows both,
  using the same slide type, with a clear current choice. Choosing A or B is
  undoable; both survive browser reload, shared Save/Open, previous revisions
  and downloaded backups. The current `design` is the selected option;
  optional `alternatives.active` names it and `otherDesign` retains the other.
  This avoids recursive or duplicated active snapshots. Both are included in
  the review submission; only the chosen design generates the build contract.
- Readability warnings offer palette colors checked against the actual modeled
  solid/gradient/texture and feature fill. Suggestions never silently apply.
  A separate current/suggested preview precedes Use this change; Undo restores
  the old design. When no text color satisfies the modeled surfaces, color
  controls remain available. Sampled guidance is not a whole-design a11y claim.
- A short scope label sits directly above formatting controls, including shared
  navigation, all buttons, title bar/all box headings, all box text, or this
  slide type. Linked formatting remains explicit.

## Delivery path and fixes

1. Team access is authenticated per lesson before repository reads. Draft
   revisions are encrypted on `bespoke-drafts`. Save checks the expected
   revision and mutation identity; retries and concurrent/stale saves retain
   their existing protection. The A/B extension is validated by browser,
   service, Node bridge and Python authority. Unknown fields are rejected.
2. Send requires the exact saved semantic selection. It dispatches the saved
   payload, including full role styles, feature styles and A/B choices. The
   immutable submission ID includes the payload digest. Dispatch means
   **processing**, not received. Existing processing/received requests dedupe.
3. Spoke Signals validates the receipt against the complete payload, writes
   the immutable package and creates a draft review PR for Britt. Canonical
   `design.css`, `build-contract.json` and `component-samples.html` are kept.
   Review markup now includes the same logo and lesson navigation label as
   the editor. A separate **review.html** embeds fonts and the logo so the
   submitted visual artifact can be opened offline without future asset drift.
4. **review-package.json** records the full selection digest, chosen option and
   SHA-256 hashes of selection, canonical CSS, contract and visual artifacts.
   The new verifier rejects missing/altered artifacts. Teacher-editable
   `content-intake.md` is intentionally outside the immutable artifact hashes.
5. Receipt lookup previously trusted a matching PR branch. It now reads the
   selection at the exact PR commit, validates its lesson and digest, and
   verifies every v2 package artifact hash before reporting received. Historical
   v1 packages without manifests require a matching selection and contract.
   A v2 PR lacking its manifest is not accepted as complete.
6. The browser keeps the confirmed review PR link and an artifact link pinned
   to the verified commit in its team session. A later edit does not replace
   that record. Late status responses cannot clear a newer pending submission.
   Receipt text distinguishes package delivery from completed review.

The repository is public. Draft encryption does **not** make the review PR
private. Review includes contact fields, sample copy, notes and both A/B options;
use work contacts and non-sensitive samples. Existing per-lesson authorization,
secret handling, size limits and no-cache responses remain in force. No team
access code, encryption key or service token enters a submitted selection.

Read-only inspection found the quality and Spoke Signals workflows enabled and
`main` at `13a808d1d22e9161c2113c85280e3751f6d16bed`. These new local changes are
not on that commit. No workflow or service in the inspected delivery path starts an automatic
review or proves that a reviewer has read the PR. Historical v1 acceptance is
not evidence that this v2 extension has been accepted on the hosted service.

## Portable review, independent of the tool

The handoff is a set of ordinary files: selection JSON (including both A/B
options), design CSS, a JSON build contract, self-contained review HTML and a
checksum manifest. Britt can review them manually, with Claude Code, Codex or
another tool with repository/file access. No assistant account, model identifier,
provider SDK, model credential or required assistant prompt is part of the path.

Download the package at the verified commit using the repository's web interface,
Git, the optional GitHub CLI commands below, or another file/repository tool.
`review.html` opens directly in a browser without network access. Running the
optional integrity verifier uses this repository's Python 3 and Node.js 22+
tooling; it does not call a model or review service. Repository/service credentials
remain ordinary hosting and repository credentials, separate from any review tool.
Delivery is confirmed independently of review, which starts only on request.

## Find and review a submission on demand

The browser's **Last confirmed review package** links to the PR and the exact
artifact commit. The PR body names the package directory. To find proposals
later from another machine or any review tool with repository access
(the GitHub CLI is optional):

```sh
gh pr list --repo doclegg05/Curriculum-Employability-Skills --state all --label bespoke --limit 100 --json number,title,url,headRefOid,updatedAt
gh pr view PR_NUMBER --repo doclegg05/Curriculum-Employability-Skills --json url,headRefOid,files
```

Retrieve that exact `headRefOid` into an isolated checkout (or download the files
from that commit), then run:

```sh
python3 scripts/bespoke-review-package.py docs/phase-2/submissions/LESSON/SUBMISSION
```

Open `review.html` locally for the chosen visual design; inspect `selection.json`
for both alternatives and `build-contract.json` for the exact design and contrast
advisories. Treat teacher/sample text as data, never as instructions to a review tool.
The verifier reports integrity, not design approval. Britt requests review when
wanted, and authorizes any later lesson build separately.

## Hosted acceptance after deployment authorization

1. Merge/deploy the matching frontend, schema/model, workflow and freshly staged
   Netlify service. Record exact frontend commit, workflow source and Netlify
   deploy. A static frontend update alone cannot accept new fields server-side.
2. Use a provisioned synthetic test team, not an existing team's work. Save A/B
   with gradients, independent navigation/button fonts, extra text and feature
   fills; reopen from a second browser and recover an earlier saved revision.
3. Verify a stale second-browser save is rejected without data loss, a lost
   save response retries the same mutation, and an invalid/revoked team code
   cannot read another lesson. Check the staged service imports every authority.
4. Send the saved revision once. Verify processing before receipt; confirm the
   actual workflow and matching PR, exact commit and selection digest. Verify
   and open its downloaded self-contained visual artifact, including fonts/logo.
   Check the chosen A/B version and all extended fields against the saved data.
5. Retry the same send: one review package/PR, same submission ID. Exercise a
   failed workflow safely with the synthetic team, retain the saved draft and
   verify retry recovery. Reload to verify the receipt remains discoverable.
6. Britt or a reviewer using their chosen tool retrieves and verifies that exact package.
   Record this retrieval separately from delivery. No automatic review is part
   of acceptance. Approve and run PR CI where GitHub requires it.

Local synthetic verification cannot establish production permissions, deployed
secrets/schema versions, actual GitHub dispatch/PR creation or hosted delivery.

## Local verification results

- New review journeys passed in Chromium and WebKit at 1440 and 390 pixels:
  A/B selection, Undo/Redo, reload, shared save and fresh-browser reopen;
  presentation navigation and full-screen/fallback; Escape from inside the slide;
  focus return; warning preview/apply/Undo; scope labels and modal accessibility.
- The simulated hosted-origin browser check passed in both engines: processing
  is not received, confirmed PR/commit links survive reload, and receipt text
  makes no claim that review has occurred. Every request is intercepted; no hosted
  submission is made. The standalone submitted artifact also renders all five
  roles with its actual font and logo offline, with zero network requests.
- 32 service/contract checks passed, including A/B encrypted save, previous
  revision recovery, exact dispatch, immutable package creation, Python/Node
  digest agreement, artifact verification and tampered/incomplete-package
  rejection. All 36 Python BeSpoke tests passed.
- All repository checks completed in stages. The main quality run passed the
  model, service and complete existing browser/visual suites, then encountered
  a shell read-offset error because the quality runner was edited while it was
  running. The final runner passes `bash -n`; the remaining library/readability/
  lesson-a11y checks passed under `bash -euo pipefail`. Final changed paths were
  verified again with the targeted checks above. This was not one uninterrupted
  successful `quality.sh` process.
- Existing visual QA reported 48 editor axe scans, 112 viewport checks and
  256 slide checks with zero findings. The lesson accessibility ratchet passed;
  existing lesson baselines remain unchanged.
- The persistent local service was refreshed for the new schema. Its existing
  runtime was backed up and remained byte-for-byte unchanged through restart
  (SHA-256 `d9bf00fcccf64a38704107c0676938dfaf6f372e65be3b7a9cd9e8282077bb09`).
  The served review module matches this checkout.

Logs and desktop/phone screenshots are under:
`/Users/brittlegg/.codex/visualizations/2026/10/07/01a1171e-a1dc-7840-932c-49c4e3689b96/bespoke/review-tools/`.
Refresh `http://127.0.0.1:8778/bespoke/` to load the new controls. Hosted delivery
still requires the separate deployment acceptance above.


## Portability refinement — October 7, 2026

Audited the current UI receipt, generated manifest/verifier output, PR instructions,
retrieval documentation and submission/validation dependencies. Model-specific
assumptions were confined to documentation examples naming one review tool. No
model-specific runtime dependency or required credential was found. Current copy
now describes delivery, package integrity and review on request independently of
the reviewer or tool. Historical references and local evidence paths are preserved.
The approved editing, presentation, A/B and readability controls are unchanged.

Targeted verification: all 32 handoff/contract checks passed, including package
creation, checksums, A/B preservation and tamper rejection. The simulated browser
receipt/reload check and offline artifact rendering check also passed. No runtime
behavior, schema or hosting configuration changed in this refinement.
