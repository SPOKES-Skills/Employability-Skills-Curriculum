# BeSpoke shared design service setup

This is the administrator guide. Teachers use a private team link, choose a look,
and save it. They do not create accounts, choose passwords, edit files, or run
commands. Their [meeting guide](../../bespoke/team-guide.html) explains those steps.

The connected deployment uses GitHub Pages. Its Save, Open, history, and Send controls call
a Netlify function. The function stores encrypted design revisions on the
`bespoke-drafts` Git branch and starts the existing Spoke Signals workflow when a
team requests review. Neither saving nor sending builds lessons, applies a design
to lesson HTML, merges a proposal, or publishes content.

## Process map

This flow is implemented by the service and builder. The initial v1 hosted release
passed [live acceptance on September 22, 2026](verification-2026-09-22.md). The
current v2 three-stage builder is prepared for local review; its synthetic Save
test design/Open test design service blocks Send and receipt-status calls. The
earlier acceptance does not establish hosted v2 readiness. Deploy compatible
reviewed builder/service versions and repeat the relevant checks below after
service, workflow, access, or hosting changes.

```mermaid
flowchart TD
    A[Private team link] --> B[Verify team access]
    B --> C{Unsaved browser work}
    C -->|None| D[Restore latest shared design]
    C -->|Present| E[Keep or download draft before choosing]
    E --> D
    D --> F[Team edits the visual design]
    F --> G[Save with last opened revision]
    G --> H{Revision still current}
    H -->|Yes| I[Encrypted revision on bespoke-drafts]
    H -->|No| J[Conflict with backup and load latest options]
    J --> F
    I --> K[Confirmed shared save]
    K --> D
    K --> L[Send canonical saved revision]
    L --> M[Spoke Signals Action]
    M --> N[Immutable design proposal]
    N --> O[Matching pull request receipt]
    O --> P[Received shown to teacher]
    P --> Q[Britt reviews design]
    Q --> R[Separate build authorization and complete content]
    R --> S[Later build checked against design contract]
```

Team access protects opening and changing the shared draft. The repository is
public, so the proposal created by **Send to Britt** can be read publicly. Use work
contact details and non-sensitive sample text. A private team link does not make
the review proposal private; never include credentials in selection content.

## Provision private team access

Access is assigned by Britt or an administrator before teams begin. Each of the
six planned lessons gets its own random access code and private link. A code is
8 characters in two groups of four, like `K7QX-M3PD`, with no 0, O, 1, I or L. There is no
public first-come claim of a lesson and no teacher-chosen four-character code.
Anyone with a team's code or link can use that team's design, so share it only in
that team's private OneDrive folder or another approved private location.

Each team can also have a team view link. It opens the team's latest saved design
read-only. Pin this link in the team's private Teams channel.

Run the first provisioning command once. It creates the access files and the six
team links. A second command adds the view links, as
[Add team view links](#add-team-view-links) describes.

```sh
node scripts/bespoke-provision.mjs \
  --output "/absolute/path/to/private-bespoke-setup" \
  --wizard-url "https://YOUR-PAGES-HOST/YOUR-PROJECT/bespoke/"
```

Use an output directory outside any git repository and outside any public website.
The command creates `server-env.json`, `team-access.json`, and `team-links.html`
with owner-only file permissions in an owner-only directory. It refuses an existing
output directory or a directory inside a git repository. It does not create a PAT
or rotate an existing service's keys. Store the resulting material in approved
private storage. Do not paste access codes, private links, encryption keys, tokens,
the `BESPOKE_TEAM_KEYS` value, or `team-env.json` into an issue, pull request,
repository file, public channel, or diagnostic log. The team-key table holds only
hashes, but an 8-character code can be recovered from its hash in minutes.

A team link ends with `#team=<lesson-id>.<access-code>`. A team without its link
can type the code in **Open your team design**; case, spaces and the dash do not
matter. The browser removes
that credential from the address bar when it reads the link and remembers the
team session locally when browser storage permits. The fragment is not part of
the initial page request. The credential is still used to authenticate service
requests; it is a real access secret, not a visual-preview lock. Treat remembered
access on shared computers with the same care as the original link.

Put each team's code in that team's private OneDrive folder, and only that team's
code. Never put `team-links.html` or `team-access.json` there: they hold all six
codes. A teacher on another computer types the code in Open team design. Ask teams
to keep one person operating BeSpoke during each meeting.
### Add team view links

Run this once, against the private directory that already holds `team-access.json`:

```sh
node scripts/bespoke-provision.mjs \
  --output "<the existing private directory>" \
  --wizard-url "<the BeSpoke page URL>" \
  --add-view-links
```

It writes `view-env.json`, `view-access.json` and `view-links.html` beside the
existing files, with owner-only file permissions. It does not open or change
`server-env.json`, `team-access.json`, `team-links.html` or the encryption key. It
refuses a directory that has no `team-access.json`, and it refuses to run while
any of the three `view-*` files already exists.

Then:

1. Set `BESPOKE_VIEW_KEYS` from `view-env.json` the same way `BESPOKE_TEAM_KEYS`
   was set from `server-env.json`. The new value takes effect when the service is
   next deployed.
2. Pin each link from `view-links.html` in that team's channel. Each link is for
   one team only.

Pinning a view link does not switch off a team link that was already pinned or
shared. Unpin the team link. If it reached people who should not edit, see
[Reissue team codes](#reissue-team-codes).

A team view link ends with `#view=<lesson-id>.<random-view-code>`. The browser
removes it from the address bar and keeps it only for that tab, so a reload stays
in the view. The banner shows the lesson, "View only", the save time and the
builder's name, with a Refresh button for a newer save. A view code opens the
latest saved design and nothing else. The service refuses history, saving and
sending for it. Its answer leaves out the Team Leader's email, the notes for the
design review and any older wizard design kept for recovery. A view code typed
into the Open dialog opens the same read-only view.

The service hashes view codes with a `view:` prefix. A `view-env.json` made before
view codes got that prefix will not work and must be regenerated. Move the three
`view-*` files aside, run the command again, and delete the old files once the new
run has succeeded.

## Configure the service

Create a fine-grained GitHub personal access token limited to
`doclegg05/Curriculum-Employability-Skills` with:

- **Contents: Read and write**, for encrypted design revisions on `bespoke-drafts`.
- **Actions: Read and write**, to dispatch and observe the Spoke Signals workflow.
- **Pull requests: Read**, to confirm the matching proposal receipt. Creation of
  the proposal uses the workflow token, not this PAT.

The workflow's own GitHub token creates the proposal pull request. Teachers never
receive the administrator token. Keep the PAT restricted to this repository; it
is not a teacher credential and is not the encryption key.

Set these Netlify environment variables in the **production** deploy context.
Use Functions scope and mark values secret when the plan supports those features.
The current Personal plan uses standard protected project environment variables
with all scopes; values are readable to authorized account administrators, not
write-only Secrets Controller values. No plan upgrade is required. Never copy
values into the public site, build output, or `netlify.toml`. This service has no
build step that embeds environment values. Verify the variable names and runtime
behavior after setting them; the connector can incorrectly report success for a
setting the plan rejects.

Service variables. The first three are required.

| Variable | Value and purpose |
|---|---|
| `BESPOKE_GITHUB_TOKEN` | The restricted PAT described above |
| `BESPOKE_DRAFT_KEY` | A stable, independently generated 32-byte encryption key encoded as base64 |
| `BESPOKE_TEAM_KEYS` | A JSON object mapping each allowed lesson ID to the SHA-256 base64url digest of its provisioned access code |
| `BESPOKE_VIEW_KEYS` | Optional. A JSON object mapping each lesson ID to the SHA-256 base64url digest of its team view code, hashed with a `view:` prefix. A view code can open the latest saved design and nothing else. A missing or empty value means no view links. A malformed value switches view links off and logs a warning with no values, and edit codes keep working |

The provisioner supplies the encryption key and team-key map in `server-env.json`,
and the view-key map in `view-env.json`. After a reissue, the current team-key map
is in `team-env.json` instead; see [Reissue team codes](#reissue-team-codes).
The teacher links are in `team-links.html` and the team view links are in
`view-links.html`. `team-access.json` and `view-access.json` are private
administrator recovery material. Only access-code hashes go into `BESPOKE_TEAM_KEYS`; keep the original private links outside the
service configuration. Keep a secure backup of `BESPOKE_DRAFT_KEY`: losing it
makes the stored designs unreadable.

Stage the small service package before deploying:

```sh
node scripts/bespoke-stage-service.mjs "/absolute/path/to/new-service-stage"
```

Choose a new staging directory outside this repository. Run the authorized
Netlify CLI or connector deployment from that staging directory, not from the
full curriculum checkout. The stage contains only `netlify.toml`, the function
and its shared module, the landing note, the two selection schemas, the builder
model and catalog, the older catalog, the library catalog, and a minimal Node
package manifest. It excludes lesson media, private setup
files, and credentials. The repository remains the source of truth; create a
fresh stage after code or catalog changes, and do not edit the staged copy.
Publish `netlify/site`, use functions in `netlify/functions`, and leave the build
command empty. Netlify hosts the service and a short landing note, not a second
curriculum site.

Set the public `apiBase` in `bespoke/handoff-config.json` to
`https://YOUR-SERVICE.netlify.app/api/bespoke`, then publish the wizard/configuration
on the Pages branch. The endpoint URL is public; never place any secret in that
file. The workflow and function must be deployed from compatible reviewed code.

Until both the endpoint and service configuration are deployed, the browser must
show that shared saving is unavailable. A local browser copy or a downloaded
backup is not evidence of a successful shared save.

## What saving and sending mean

**Save for the team** writes an encrypted revision. The browser supplies the
revision it last opened, so a newer save from another computer produces a conflict
instead of silently being overwritten. A failed or uncertain save must remain
visible to the teacher, with a downloadable backup available. Browser storage is
a convenience copy and may be cleared or unavailable.

**Open team design** loads the latest shared revision after access is verified.
Opening a private team link can restore the shared design automatically when the
browser has no unsaved changes. Unsaved browser work must be preserved until the
teacher chooses which version to keep. History offers older saved looks; saving
an older look creates a new revision rather than deleting newer history.

**Send to Britt** submits the saved design through Spoke Signals. Starting the
workflow is only processing, not delivery. The UI may confirm delivery only after
the service confirms the matching proposal pull request. On Send, that confirmation is the
**Sent to Britt** view; on any other stage it is the toast **Sent to Britt.** Failure, timeout, and
pending processing must be distinguished. Retrying the same design must find or
reuse its existing proposal rather than create duplicates. Design review is
separate from permission to build a lesson.

Do not merge `bespoke-drafts` into `main`. It contains encrypted team records, not
publishable curriculum. Its commits provide saved-version history; the interface lists the newest ten
saves. Do not prune
or rewrite that branch without an agreed retention and recovery plan.

The function is configured to limit requests to 120 per IP address per minute.
Several teams may share a school network address. Include concurrent team use in
the hosted check and confirm a limit response is shown as retryable, never as a
successful save or receipt.

## Rotation and recovery

- **PAT rotation:** replace `BESPOKE_GITHUB_TOKEN` while retaining the draft key and
  team-key map. The stored designs remain decryptable because encryption does not
  depend on the token. Verify Open and Save after the replacement.
- **Team access reset:** follow [Reissue team codes](#reissue-team-codes) below.
  Only an administrator runs it.
- **Team view code rotation:** move the three `view-*` files aside and run
  `--add-view-links` again. Delete the old files once the new run has succeeded. That replaces all six view codes at once. Update
  `BESPOKE_VIEW_KEYS` from the new `view-env.json` and deploy the service. The old
  view links stop working after the deploy, so pin the new ones in their place.
- **Draft-key rotation:** requires a deliberate data migration. Do not simply
  replace the key or rerun setup with a new key over an existing service. Preserve
  the previous key securely until all retained revisions are migrated and tested.
- **Browser loss:** reopen the original team link to recover the latest confirmed
  shared revision. Use a downloaded backup for work that never reached the service.
- **Submission failure:** check the matching Spoke Signals workflow and proposal
  receipt. Do not tell a team its design was received merely because dispatch
  returned successfully.

## Reissue team codes

Reissue a code when a team has lost both its link and its code, or when a link
reached someone outside the team. If the team only lost the link, open
`team-links.html` in the current private folder and send the same link or code
again. Nothing changes on the service.

To replace one team's code:

```sh
node scripts/bespoke-provision.mjs \
  --output "<the current private folder>" \
  --wizard-url "https://YOUR-PAGES-HOST/YOUR-PROJECT/bespoke/" \
  --reissue money-management
```

`--reissue all` replaces all six codes. It also works with a new, empty folder
path, so use it if the private folder is lost. A one-lesson reissue needs the
current `team-access.json`, because it keeps the other five codes.

Each run writes `team-env.json`, `team-access.json` and `team-links.html`. It
first moves the files it replaces into a `previous-<UTC date and time>` folder.
The old codes stay live until the service is redeployed, so keep that folder
until the deploy is done. The command never reads or writes `server-env.json`
or `BESPOKE_DRAFT_KEY`, so every saved design stays readable.

Then:

1. Set `BESPOKE_TEAM_KEYS` in Netlify to the value in the new `team-env.json`.
2. Stage the service and deploy it. Netlify gives the function the new value only
   on a new deploy.
3. Open the old link. It must be refused. If it still opens, the deploy did not
   pick up the new value.
4. Put the new code in the team's OneDrive folder and delete the old one.
5. Delete the `previous-*` folder. After a one-lesson reissue it still holds the
   other five live codes, so it needs the same care as `team-access.json` until
   it is gone.

After a reissue, `team-env.json` holds the current `BESPOKE_TEAM_KEYS`. The copy
inside `server-env.json` is the original table. Never restore it into Netlify
after a reissue, because it would bring back the replaced codes.

## Deployment acceptance

Local tests do not prove the hosted service works. Before inviting teams, use a
synthetic design to verify all of the following against the deployed Pages and
Netlify versions:

| Check | Expected result | Failure and recovery |
|---|---|---|
| Open a provisioned link, then try an invalid or revoked code | The assigned lesson opens; the other request is rejected before its data is read | Administrator replaces the private team link; no public claiming or teacher-created code |
| Open a team view link | The latest saved design opens read-only. The banner says View only and shows the save time. No control changes the shared design | Check that `BESPOKE_VIEW_KEYS` came from the current `view-env.json` and that the service was deployed after it was set |
| Save on one computer, close it, open on another | The same confirmed revision and choices appear | Preserve the browser draft or backup; check endpoint/configuration and retry |
| Open with unsaved browser work | Explicit choice preserves the local draft until the teacher decides | Download the unsaved draft before loading a different shared version |
| Save concurrently from two computers | The older revision produces a conflict and cannot overwrite the newer save | Download backup, load the latest design, discuss/reapply agreed differences, save anew |
| Review an older saved look and restore it | An explicit restore onto the current shared revision creates a new save; later history remains | A stale revision is still rejected; refresh latest before applying recovered choices |
| Interrupt the network while saving | Pending, failed, and successful saves are distinguished; backup remains usable | Keep the page open, download a backup, reconnect, and verify the latest shared save |
| Send the current saved design | Processing persists until a matching draft proposal pull request is confirmed | Surface failure or pending status; retry the same request without unrelated duplicates |
| Change local choices without saving, then send | The service does not silently submit a different saved or unsaved design | Save deliberately and send the matching current shared revision |
| Use several teams behind one network address | Normal concurrent use completes; a rate-limit response remains a visible retryable failure | Preserve drafts and backups, wait before retrying, and review service limits if ordinary meetings are affected |
| Rotate the PAT while keeping the draft key | Existing revisions still decrypt and Save/Open work | Restore valid repository permissions; never regenerate the draft key to fix token access |
| Leave a shared-browser session | After save/backup confirmation, remembered access and local recovery data are removed; shared record remains | Close all team tabs and remove private downloaded material after securing needed work |

Record the deployed commit, dates, devices/browsers, revision IDs, and a synthetic
proposal receipt. Redact access links and secrets. The process is not accepted
until the tests exercise the real Pages host, Netlify service, and GitHub workflow.

The initial deployment passed the live Pages → Netlify → GitHub Save/Open/Send
flow on September 22, 2026. See [the verification record](verification-2026-09-22.md)
for deployed versions, test proposal, cleanup, and the boundaries of testing.
The initial GitHub token expires December 21, 2026; renew it before that date
without changing the draft encryption key.
