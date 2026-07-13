# Intake Bridge Output + Candidate Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` (recommended) or
> `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox syntax for tracking.

**Goal:** Repair the intake runner's Bridge-output contract, close the evidence
gate hole exposed by `centauri_carbon_2`, and continue that preserved candidate
from its review checkpoint without rerunning Scout or bypassing PD5.

**Architecture:** The wrapper owns a durable ignored Bridge output directory;
the kickoff and cross-repo runner contract pin the same absolute path. The
candidate evidence gate gains one narrow owner-resolved repository-convention
lane for the passive-enclosure 45 °C threshold plus packet-to-materialized-row
parity. Candidate state stays ignored until fresh dual review. Shipped
provenance remains post-live custody on `main` only.

**Tech Stack:** zsh/bash, Node.js CommonJS + `node:test`, Git/GitHub, Bridge
v0.2.0, Claude Opus 4.8, Codex gpt-5.5, launchd, Cloudflare Pages, iOS local
data mirror.

## Global Constraints

- Web repo: `/Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant`.
- AI-OM repo: `/Users/mustafaozturk-macmini/dev/Claude/Projects/ai-operating-model`.
- iOS repo: `/Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant-ios`.
- Never edit `engine.js` or `app.js`.
- The only validator change in scope is
  `scripts/validate-candidate-evidence.js` and its tests.
- Do not run Scout and do not kickstart the full LaunchAgent for this candidate.
- Do not delete the local candidate branch, parked state, old session logs,
  Bridge reports, `be49fea`, or `8695583`.
- Preserve `bridge-2026-07-13-100815-004699.md` byte-for-byte; known SHA-256:
  `1f03b8aa2897d4eb4c5427a138f1e690124492c140c5867a26fec33d7f108774`.
- Preserve iOS's six current local commits. A seventh data-mirror commit is
  allowed only after fresh `{GO,GO}`, web merge/push, and live verification.
- Never push iOS.
- `docs/printer-provenance.json` and the outcomes ledger are edited only after
  successful live verification, never on the candidate branch.
- Every accepted review finding lands as its own commit.
- Planning precondition: this design, plan, execution prompt, ROADMAP update,
  and plan-review ledger are committed and pushed before Task 0 starts. The
  implementation never begins with planning-doc drift in the web worktree.
- Keep the claude-sync hold active through implementation/review commits and
  release it immediately after the deliberate final commit.
- A failed gate stops at the current checkpoint; do not widen scope or sample a
  reviewer again in the same run.
- After Task 0 unloads launchd and sets the sync hold, every success, failure,
  and early abort executes the mandatory finally block in Task 9 Step 4. No
  `stop` instruction may bypass scheduler restoration and hold release.

## Cross-platform impact

- The wrapper and launchd behavior are macOS-only, but their shell fixtures must
  remain portable across macOS/Linux as today.
- The evidence validator is Node-only and changes automation semantics, not app
  runtime behavior or UI/UX.
- If the candidate ships, web bundled data and the remote iOS overlay change;
  iOS receives a byte-identical local bundled-data mirror without TestFlight.
- No Swift, Android, engine, web UI, or product-flow change is required.

---

### Task 0: Freeze scheduling, reverify truth, and preserve incident inputs

**Files:** No tracked edits.

**Interfaces:**
- Consumes: current `main`, ignored incident state, LaunchAgent registration.
- Produces: isolated execution window, hashes, active sync hold.

- [ ] **Step 1: Pull shared state, fetch all refs, and surface health**

```bash
cd /Users/mustafaozturk-macmini/dev/Claude/Projects
~/.claude/claude-sync.sh pull
~/.claude/claude-sync.sh hold "3dpa intake Bridge recovery implementation"
git -C 3dprintassistant fetch origin --prune --tags
git -C ai-operating-model fetch origin --prune --tags
git -C 3dprintassistant-ios fetch origin --prune --tags
git -C 3dprintassistant status --short --branch
git -C ai-operating-model status --short --branch
git -C 3dprintassistant-ios status --short --branch
```

Expected: web `main` equals `origin/main` except the known untracked root Bridge
report; AI-OM is clean/current; iOS is clean and six commits ahead. Any other
drift stops the plan.

- [ ] **Step 2: Temporarily unload the scheduler**

```bash
launchctl print gui/$(id -u)/dk.mragile.3dpa-intake
launchctl bootout gui/$(id -u)/dk.mragile.3dpa-intake
! launchctl print gui/$(id -u)/dk.mragile.3dpa-intake
```

Expected: the agent was loaded but idle, then becomes unavailable. Record that
it must be restored in Task 9 on every terminal path.

- [ ] **Step 2b: Provision and verify the durable Opus 4.8 reviewer wrapper**

Using `apply_patch`, create
`/Users/mustafaozturk-macmini/.local/bin/claude-opus-4-8` only if absent, with:

```zsh
#!/bin/zsh
exec /Users/mustafaozturk-macmini/.local/bin/claude \
  --model claude-opus-4-8 "$@"
```

Make it executable. If it already exists, require byte-equivalent behavior;
never overwrite a different wrapper silently. Then verify:

```bash
test -x /Users/mustafaozturk-macmini/.local/bin/claude-opus-4-8
bridge --help | grep -q -- '--claude-bin CLAUDE_BIN'
/Users/mustafaozturk-macmini/.local/bin/claude-opus-4-8 --version
```

The first real `bridge --mode claude-only` call in Task 2 is the model-availability
smoke. If the exact model or flag is rejected, stop through the mandatory
finally block; do not fall back to another Claude model without owner approval.

- [ ] **Step 3: Verify immutable incident objects before mutation**

```bash
cd /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant
test "$(git rev-parse be49fea)" = be49fea245277e601d20e95a144bc80777e48397
test "$(git rev-parse 8695583)" = 8695583b8748ee247970d9c598f729ecf5dc90e6
test "$(git rev-parse intake/centauri_carbon_2)" = 8695583b8748ee247970d9c598f729ecf5dc90e6
test "$(shasum -a 256 bridge-2026-07-13-100815-004699.md | awk '{print $1}')" = \
  1f03b8aa2897d4eb4c5427a138f1e690124492c140c5867a26fec33d7f108774
test -f scripts/.intake-runner-state/parked/centauri_carbon_2/parked.json
test -f scripts/.intake-runner-state/parked/centauri_carbon_2/candidate-elegoo-centauri_carbon_2.json
test ! -e scripts/.intake-run.lock
```

Expected: all commands exit 0. If an object or hash differs, stop without
editing anything. Record `MANUAL_RUN_START_EPOCH=$(date +%s)` in the execution
notes now; Task 9 uses that exact value.

- [ ] **Step 4: Preserve the current runner log before any manual replacement**

Create
`scripts/.intake-runner-state/incident-evidence/last-run-session-before-manual-20260713.log`
as a byte-identical copy of `last-run-session.log`, record both SHA-256 values,
and verify equality. Do not overwrite an existing archive with a different
hash.

---

### Task 1: Test-drive the Bridge output repair

**Files:**
- Modify: `scripts/intake-run-wrapper.test.sh`
- Modify: `scripts/intake-post-run-invariants.test.sh`
- Modify: `scripts/validate-reviewer-output.test.js`

**Interfaces:**
- Produces: executable regression proof for directory creation, ignored output,
  root-artifact rejection, and the exact kickoff command.

- [ ] **Step 1: Add wrapper RED cases**

Add assertions that a successful wrapper run creates
`$STATE/bridge-reviews`, and that a pre-existing non-directory at that path
causes a fail-closed non-zero exit plus a `bridge-output` failure notification
before the Claude stub is invoked.

- [ ] **Step 2: Add POSTRUN strictness/retention cases**

Keep the existing root report case expecting `web-dirty`. Add a separate case
that writes `bridge-*.md` under `$STATE/bridge-reviews/` and expects
`POSTRUN ok=true`.

- [ ] **Step 3: Add the exact kickoff contract assertion**

In `validate-reviewer-output.test.js`, assert that the kickoff contains exactly:

```text
bridge --mode codex-only "<concrete review prompt over the main...intake/<printer-id> diff>" \
  --out-dir /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant/scripts/.intake-runner-state/bridge-reviews
```

Also retain the direct fallback assertion for
`codex exec -s read-only -m gpt-5.5`.

- [ ] **Step 4: Run RED and record the expected failures**

```bash
bash scripts/intake-run-wrapper.test.sh
bash scripts/intake-post-run-invariants.test.sh
node scripts/validate-reviewer-output.test.js
```

Expected before implementation: wrapper directory and kickoff command tests
fail. The root-artifact test remains green; no production file has changed.

---

### Task 2: Implement, review, and land the Bridge output repair

**Files:**
- Modify: `scripts/intake-run-wrapper.sh`
- Modify: `scripts/intake-run-kickoff.md`
- Modify: `scripts/intake-run-wrapper.test.sh`
- Modify: `scripts/intake-post-run-invariants.test.sh`
- Modify: `scripts/validate-reviewer-output.test.js`
- Modify in AI-OM: `docs/agents/intake-pipeline-runner.md`

**Interfaces:**
- Produces: ignored absolute output directory and identical governing commands.

- [ ] **Step 1: Create isolated implementation branches**

```bash
git switch -c codex/intake-bridge-output-recovery
git -C ../ai-operating-model switch -c codex/intake-bridge-output-recovery
```

- [ ] **Step 2: Make directory creation fail closed**

Define:

```zsh
BRIDGE_OUT_DIR="$STATE_DIR/bridge-reviews"
```

Move `notify_failure` above the first state-directory creation, then create
`$STATE_DIR`, `$BRIDGE_OUT_DIR`, and `.printer-intake-out` in a checked `if !
mkdir -p ...` block. Missing/non-directory/unwritable Bridge output must notify
`bridge-output` and exit `73` before `claude -p`.

- [ ] **Step 3: Prove the installed Bridge honours `--out-dir` before pinning it**

Create the ignored directory explicitly, record the current root-level
`bridge-*.md` set, then run:

```bash
bridge --health
bridge --mode codex-only \
  "Bounded output-route smoke only: inspect no files; return GO." \
  --out-dir /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant/scripts/.intake-runner-state/bridge-reviews \
  --turn-timeout-seconds 900
```

Expected: a new report exists inside `bridge-reviews/`, the root report set is
unchanged, and exit is 0. If `--out-dir` is rejected or output lands elsewhere,
stop via the mandatory finally block and do not pin the contract.

- [ ] **Step 4: Pin both operational contracts**

Update the web kickoff and AI-OM PD5 section to the exact two-line command from
Task 1. `bridge --health` remains the only probe and direct Codex remains the
only fallback. Do not add Bridge config, full mode, relative paths, or model
overrides to the scheduled contract. The 900-second flag belongs to manual
smokes/reviews only and is intentionally absent from the pinned two-line form.

- [ ] **Step 5: Run GREEN on the Mac**

```bash
cd /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant
bash scripts/intake-run-wrapper.test.sh
bash scripts/intake-post-run-invariants.test.sh
bash scripts/intake-run-preflight.test.sh
node scripts/validate-reviewer-output.test.js
git diff --check
git -C ../ai-operating-model diff --check
```

Expected: all shell suites print `all tests passed`; Node reports all tests
passing; both diff checks are silent.

- [ ] **Step 6: Obtain the implementation cross-model review**

Run a Claude Opus 4.8 hostile review because Codex is the controller:

```bash
bridge --mode claude-only \
  "Review the web and AI-OM Bridge-output diffs. Focus on pre-paid-turn failure, exact command parity, POSTRUN strictness, and root-artifact regression. Return P0/P1/P2 findings and verdict." \
  --claude-bin /Users/mustafaozturk-macmini/.local/bin/claude-opus-4-8 \
  --out-dir /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant/scripts/.intake-runner-state/bridge-reviews \
  --turn-timeout-seconds 900
```

Expected: the review writes only inside the ignored directory; no root
`bridge-*.md` appears. This call also proves the durable wrapper, exact Opus
model, and `--claude-bin` path. Any P0/P1 is fixed one finding per commit and
reviewed again.

- [ ] **Step 7: Commit and land both repos deliberately**

```bash
git add scripts/intake-run-wrapper.sh scripts/intake-run-wrapper.test.sh \
  scripts/intake-post-run-invariants.test.sh scripts/intake-run-kickoff.md \
  scripts/validate-reviewer-output.test.js
git commit -m "fix(intake): isolate Bridge review output"

git -C ../ai-operating-model add docs/agents/intake-pipeline-runner.md
git -C ../ai-operating-model commit -m "docs(intake): pin Bridge review output directory"
```

Reverify `origin/main` has not moved, fast-forward each local `main` from its
reviewed branch, and push both. Never stage the root incident report.

- [ ] **Step 8: Relocate the incident report with hash equality**

After both fixes are on `main`, move the root report to
`scripts/.intake-runner-state/bridge-reviews/bridge-2026-07-13-100815-004699.md`.
Require destination absence first, compare source/destination SHA-256 to the
known value, and prove `git check-ignore` succeeds. Web `main` must then be
clean and equal `origin/main`.

---

### Task 3: Test-drive honest candidate evidence and materialized parity

**Files:**
- Modify: `scripts/validate-candidate-evidence.test.js`

**Interfaces:**
- Consumes: packet metadata plus `data/printers.json`.
- Produces: deterministic pre-review failure for omitted/mismatched fields.

- [ ] **Step 0: Create fresh evidence-gate branches from synchronized main**

```bash
git switch -c codex/intake-evidence-parity
git -C ../ai-operating-model switch -c codex/intake-evidence-parity
```

Expected: both branches start at their newly pushed Bridge-fix `main`.

- [ ] **Step 1: Add a materialized-catalog fixture**

Build each materialized row by unwrapping packet metadata objects through
`.value` while preserving scalar `id`/`name`/`manufacturer`. Wrap rows as
`{ brands: [], printers: [...] }`.

- [ ] **Step 2: Add parity RED tests**

Test all of these with `reviewRequests === 0` on failure:

1. materialized candidate missing from the catalog;
2. packet field value differs from the materialized row;
3. materialized `open_door_threshold_bed_temp` exists but the packet omits it;
4. packet notes contain a citation but materialized notes omit it.

- [ ] **Step 3: Add repository-convention RED tests**

The passing fixture is exactly:

```js
{
  value: 45,
  source: null,
  confidence: 'owner-approved',
  evidenceType: 'repo-convention',
  ownerResolution: {
    policy: 'passive-enclosure-open-door-threshold',
    approvedAt: '2026-07-13T12:00:00Z',
    rationale: 'Owner approved the existing 3dpa passive-enclosure convention.',
  },
}
```

Add failures for missing/malformed owner resolution, a non-45 value,
non-passive enclosure, use on another field, a passive corpus row missing the
field, and a passive corpus row with any value other than 45.

- [ ] **Step 4: Prove RED**

```bash
node scripts/validate-candidate-evidence.test.js
```

Expected: only the new parity/convention tests fail.

---

### Task 4: Implement the targeted evidence gate and align canonical docs

**Files:**
- Modify: `scripts/validate-candidate-evidence.js`
- Modify: `scripts/validate-candidate-evidence.test.js`
- Modify: `scripts/intake-run-kickoff.md`
- Modify: `docs/runbooks/printer-addition-protocol.md`
- Modify: `docs/superpowers/specs/2026-07-10-intake-autonomy-v2.1-evidence-retry-retrospective-design.md`
- Modify in AI-OM: `docs/agents/intake-pipeline-runner.md`

**Interfaces:**
- New CLI: `node scripts/validate-candidate-evidence.js <candidate-packet> --printers-json <catalog>`.
- Extended API: `validateCandidateEvidence(candidate, { printersData })`.
- New helper: `validateMaterializedParity(candidate, printersData)`.

- [ ] **Step 1: Add parity helpers**

Use `node:util.isDeepStrictEqual`. Resolve the id from
`candidate.proposedTaxonomy.id` or scalar `candidate.printersJsonRow.id`; find
exactly one matching catalog row; compare every packet row field after
unwrapping metadata `.value`; and require every optional critical field present
in the materialized row to be present in the packet. All failures are
`research-defect` and spend zero review turns.

- [ ] **Step 2: Add the one narrow convention predicate**

Permit `repo-convention` only when all conditions from Task 3 hold. Require the
entire materialized passive-enclosure corpus to carry numeric `45`. Keep all
manufacturer, app-cap, and absence-rationale behavior unchanged.

- [ ] **Step 3: Require the catalog in CLI mode**

Missing `--printers-json`, unreadable JSON, invalid catalog shape, or duplicate
candidate id exits non-zero with a clear `[validate-candidate-evidence]` error.
Exported pure functions remain testable with explicit fixtures.

- [ ] **Step 4: Align all canonical contracts**

Add a clearly dated 2026-07-13 owner amendment to the ratified v2.1 RD1 design
and runbook; do not silently rewrite the original ratified rule. The amendment
adds a fourth, exact pass path for this single owner-resolved field. Update
kickoff and AI-OM stage 3b to the new CLI form and require
packet/materialized parity before PD5. Do not generalize `repo-convention` to
any other field.

Reconfirm the CLI blast radius before committing:

```bash
rg -n "validate-candidate-evidence" . ../ai-operating-model \
  --glob '!node_modules/**' --glob '!.git/**'
```

Expected: no executable positional caller remains; all operational invocations
use `--printers-json data/printers.json`.

- [ ] **Step 5: Run GREEN and regression suites**

```bash
node scripts/validate-candidate-evidence.test.js
node scripts/validate-reviewer-output.test.js
node scripts/intake-park-taxonomy.test.js
bash scripts/intake-run-preflight.test.sh
bash scripts/intake-run-wrapper.test.sh
bash scripts/intake-post-run-invariants.test.sh
git diff --check
git -C ../ai-operating-model diff --check
```

Expected: all tests green; no runtime/engine/data files changed.

- [ ] **Step 6: Cross-model review and commit**

Use `bridge --mode claude-only` with
`/Users/mustafaozturk-macmini/.local/bin/claude-opus-4-8`, output to the ignored
Bridge directory, and ask specifically about exception scope,
packet parity, CLI fail-closed behavior, and canonical-doc contradictions. Fix
P0/P1 one finding per commit. Commit the web evidence change as
`fix(intake): validate candidate packet against materialized data` and the
AI-OM contract as `docs(intake): require materialized evidence parity`; then
fast-forward/push both `main` branches after one final GREEN run.

---

### Task 5: Archive both candidate checkpoints, then rebase without replaying Scout

**Files:** No tracked edits until the rebase completes.

- [ ] **Step 1: Create immutable local and remote evidence tags**

Use annotated tags:

```text
intake-checkpoint/centauri_carbon_2-candidate-20260712
  -> be49fea245277e601d20e95a144bc80777e48397
intake-checkpoint/centauri_carbon_2-review-split-20260713
  -> 8695583b8748ee247970d9c598f729ecf5dc90e6
```

If a tag exists, its peeled object must already equal the expected commit.
Never force a tag. Push each exact `refs/tags/...` and verify the remote peeled
object with `git ls-remote --tags origin 'refs/tags/<tag>^{}'` before rebase.

- [ ] **Step 2: Rebase the preserved branch**

```bash
git switch intake/centauri_carbon_2
git rebase main
git merge-base --is-ancestor main HEAD
git diff --name-status main...HEAD
```

Expected diff remains limited to `data/printers.json`,
`catalog/ios-printer-overlay-v1.json`, and `scripts/walkthrough-harness.js`.
Both tags must still peel to their original commits after rebase.

- [ ] **Step 3: Preserve the pre-resolution packet**

Copy the current ignored candidate JSON into a non-overwriting
`parked/centauri_carbon_2/history/` file, verify source/copy SHA equality, then
edit the live candidate packet only. Keep the old `parked.json` verdict history
intact until Task 7 writes a new terminal record.

---

### Task 6: Resolve the two objections and rerun all candidate gates

**Files:**
- Modify ignored: candidate packet under `.intake-runner-state/parked/`.
- Modify: `data/printers.json`
- Regenerate: `catalog/ios-printer-overlay-v1.json`

- [ ] **Step 1: Resolve `cool_plate` in the packet**

Set `available_plates.source` to the official Elegoo manufacturer accessory
page:

`https://us.elegoo.com/products/dual-sided-build-plate-pack-for-centauri-carbon-3-pcs`

Record that it uses the term “Cool Plate Surface” for the low-temperature
PLA-facing surface. Do not claim the printer product page itself proves this.

- [ ] **Step 2: Record the typed 45 °C owner resolution**

Add `open_door_threshold_bed_temp` with the exact Task 3 shape, a real current
UTC `approvedAt`, and rationale stating that all 21 pre-candidate passive rows
use 45 and this is a repository convention, not a manufacturer claim.

- [ ] **Step 3: Make materialized notes preserve the citation**

By minimal string splice, add the packet's official Elegoo product URL to the
candidate's first `notes[]` line. Do not reserialize `data/printers.json`.
Regenerate the overlay only through:

```bash
node scripts/republish-overlay.js --add-printer centauri_carbon_2
```

- [ ] **Step 4: Commit the tracked candidate correction**

```bash
git add data/printers.json catalog/ios-printer-overlay-v1.json
git commit -m "fix(intake): preserve Centauri evidence in shipped notes" \
  -m "Sources: https://us.elegoo.com/products/centauri-carbon-2 and https://us.elegoo.com/products/dual-sided-build-plate-pack-for-centauri-carbon-3-pcs"
```

Do not add ignored packet/state files and do not edit provenance yet.

- [ ] **Step 5: Run the complete pre-review gate**

```bash
node scripts/validate-candidate-evidence.js \
  scripts/.intake-runner-state/parked/centauri_carbon_2/candidate-elegoo-centauri_carbon_2.json \
  --printers-json data/printers.json
node scripts/intake-diff-guards.js --base main
node scripts/validate-data.js
node scripts/picker-dry-run.js
node scripts/walkthrough-harness.js
node scripts/profile-matrix-audit.js
node scripts/validate-ios-printer-overlay.js
git diff --check main...HEAD
```

Expected: evidence `ok=true`, all validators green, pure additive candidate
diff, and no review turn spent before this point. Any failure parks, preserves
state, and exits only through Task 9 Step 4.

---

### Task 7: Run fresh PD5 reviews exactly once and classify the terminal branch

**Files:**
- Create ignored structured reviewer records under
  `scripts/.intake-runner-state/bridge-reviews/`.
- Update ignored `parked.json` on a non-GO terminal path.

- [ ] **Step 1: Reviewer 1 — fresh Claude Opus 4.8 hostile review**

Run a direct bounded
`/Users/mustafaozturk-macmini/.local/bin/claude-opus-4-8 -p` review so the
scheduled Bridge contract remains reserved for Reviewer 2. The prompt must inspect
`main...intake/centauri_carbon_2`, the live candidate packet, the two prior
objections, and all validator output. It must begin with the v2.1 object using
reviewer id `claude-opus-r1`; preserve its output under the ignored Bridge
review directory.

R1=Claude Opus 4.8 and R2=fresh Bridge-Codex is the implementation choice that
provides cross-model independence for this Codex-controlled recovery; v2.1
itself is model-agnostic and only requires two independent structured reviews.

- [ ] **Step 2: Reviewer 2 — fresh Codex gpt-5.5 review through the repaired route**

Run exactly:

```bash
bridge --mode codex-only \
  "Review main...intake/centauri_carbon_2 plus the candidate evidence packet. Re-evaluate every field and the two prior objections. Emit the v2.1 structured object first with reviewer bridge-codex-r2, then concise prose." \
  --out-dir /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant/scripts/.intake-runner-state/bridge-reviews
```

If Bridge is unavailable only after `bridge --health`, use the pinned direct
fallback `codex exec -s read-only -m gpt-5.5`. Do not retry a valid NO-GO.

- [ ] **Step 3: Validate both exact structured objects**

Load each saved JSON object and call `validateReviewerOutput`. Both must return
`ok:true`. Never infer JSON from prose or treat process exit 0 as a verdict.

- [ ] **Step 4: Classify the multiset**

- `{GO,GO}`: continue to Task 8.
- `{NO-GO,NO-GO}`: write `review-no-go` with both exact objections, preserve
  the branch/state, then go to Task 9.
- Split verdict: write `review-split` / `decision-required`, preserve both
  exact outputs, then go to Task 9.
- Unavailable/malformed: write `review-unavailable`, preserve all output, then
  go to Task 9.

No same-run retry, no LaunchAgent restart, and no provenance custody on any
parked path.

---

### Task 8: `{GO,GO}` only — merge, live verify, mirror, and custody

**Files:**
- Merge candidate tracked files to web `main`.
- Modify iOS local `3DPrintAssistant/Data/printers.json` only.
- Modify after live success: `docs/printer-provenance.json` and
  `scripts/printer-intake-outcomes.jsonl`.

- [ ] **Step 1: Recheck remote main and gates immediately before merge**

Fetch origin and require `main == origin/main`. If main moved, rebase the
candidate, rerun every Task 6 validator, and obtain two fresh reviews. Maximum
two such re-entries; then park `main-moved`.

- [ ] **Step 2: Fast-forward merge and push web**

```bash
git switch main
git merge --ff-only intake/centauri_carbon_2
git push origin main
```

Keep the local candidate branch and both checkpoint tags; owner preservation
overrides normal branch cleanup for this incident.

- [ ] **Step 3: Verify production delivery**

```bash
node scripts/verify-live-overlay.js
node scripts/verify-live-picker.js elegoo "Centauri Series" centauri_carbon_2
```

Expected: live overlay payload/hash and picker both contain the exact candidate.
On failure, follow PD6 rollback from the known-good snapshot; failed rollback
creates the freeze, sends CRITICAL notification, and stops.

- [ ] **Step 4: Create the local-only iOS mirror**

Copy web `data/printers.json` byte-identically to
`../3dprintassistant-ios/3DPrintAssistant/Data/printers.json`, prove `diff -q`
is silent, and commit locally as `data: mirror Elegoo Centauri Carbon 2` on iOS
`main`. Never push. Confirm the pre-existing six commits remain ancestors and
the repo is now intentionally seven commits ahead. Apply the data-only XCTest
waiver only if its schema/engine/Swift/new-key void conditions are all false;
otherwise run the full iOS XCTest suite before proceeding.

- [ ] **Step 5: Write post-live custody atomically**

Using `apply_patch`, upsert the candidate's complete per-field evidence and
typed owner resolution into `docs/printer-provenance.json`, and append exactly
one PII-safe `auto-shipped` outcome line with fresh `runId`/`ledgeredAt`. Validate
both JSON surfaces and commit only those two paths:

```bash
git add docs/printer-provenance.json scripts/printer-intake-outcomes.jsonl
git commit -m "chore(intake): custody centauri_carbon_2 provenance"
git push origin main
```

No custody commit is allowed before Steps 2–4 succeed.

---

### Task 9: Terminal report, manual POSTRUN proof, and scheduler restoration

**Files:**
- Create ignored manual session summary and run-report JSON.
- Refresh ignored `last-run-session.log` and `last-run-report.md` only after the
  old session log is archived in Task 0.

- [ ] **Step 0: Return the web checkout to clean `main`**

```bash
git -C /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant switch main
git -C /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant status --short --branch
```

Expected: checkout is `main`; the candidate branch remains preserved as a ref.
On parked paths, no candidate data is merged. Resolve any non-ignored dirt
before notify/POSTRUN; never delete evidence to make this pass.

- [ ] **Step 1: Notify the exact terminal result**

Build the normal intake report JSON with correct shipped/parked/errored counts,
candidate outcome/detail/commits, live verification result, and a note that
this was owner-approved checkpoint continuation rather than a full Scout run.
Run `node scripts/intake-notify.js <report.json>` and require `NOTIFY posted=...`.

- [ ] **Step 2: Write a non-empty manual session summary and run POSTRUN**

Create a concise ignored manual session log via `apply_patch`, copy it to
`last-run-session.log`, then run:

```bash
scripts/intake-post-run-invariants.sh \
  --repo /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant \
  --state-dir /Users/mustafaozturk-macmini/dev/Claude/Projects/3dprintassistant/scripts/.intake-runner-state \
  --run-start-epoch <manual-run-start-epoch>
```

Expected final machine line: `POSTRUN ok=true reason=none`. If it fails, copy
`last-run-session.log` and the fresh report into a new non-overwriting incident
evidence path before any later run, then execute Task 9 Step 4 before stopping.

- [ ] **Step 3: Verify final custody and evidence preservation**

```bash
git status --short --branch
git rev-list origin/main..main --count
git rev-parse intake-checkpoint/centauri_carbon_2-candidate-20260712^{}
git rev-parse intake-checkpoint/centauri_carbon_2-review-split-20260713^{}
test -d scripts/.intake-runner-state/parked/centauri_carbon_2
test ! -e scripts/.intake-run.lock
find . -maxdepth 1 -name 'bridge-*.md' -print
```

Expected: clean web `main`, ahead count 0, both original commits preserved,
parked/history evidence retained, no lock, no root Bridge artifact. On a parked
path the candidate branch remains unmerged; on a shipped path it remains as an
explicit owner-preserved ref.

- [ ] **Step 4: Mandatory finally block — restore scheduling and release the sync hold**

This step runs on every exit after Task 0 Step 2, after Task 9 Step 0 has
returned the checkout to `main`, including tag failure,
unresolved review findings, pre-review gate failure, valid NO-GO/split,
rollback/freeze, notify failure, and POSTRUN failure. It is not conditional on
Steps 1–3 succeeding.

```bash
restore_rc=0
launchctl bootstrap gui/$(id -u) \
  "$HOME/Library/LaunchAgents/dk.mragile.3dpa-intake.plist" || restore_rc=$?
~/.claude/claude-sync.sh release
launchctl print gui/$(id -u)/dk.mragile.3dpa-intake
test "$restore_rc" -eq 0
```

Expected: LaunchAgent loaded and idle; hold released. Do not kickstart it. If
scheduler restore fails, the hold must still be released and the restore
failure becomes the terminal blocker reported to the owner.

- [ ] **Step 5: Handoff**

Report only: Bridge fix status, evidence-gate status, candidate terminal
verdict, merge/live/mirror/custody facts if shipped, notification result,
POSTRUN line, and preserved refs. Then return sequencing to the reviewed iOS
1.0.7 → 1.0.8 trains. My 3DPA remains parked behind both until an explicit
owner command.

## Rollback and stop rules

- Bridge fix regression before merge: keep feature branches, do not move the
  incident report, then execute the mandatory finally block.
- Evidence-gate P0/P1: fix one finding per commit and rerun GREEN/review before
  candidate rebase; if unresolved, execute the mandatory finally block.
- Tag mismatch/push failure: do not rebase the candidate branch; execute the
  mandatory finally block.
- Candidate pre-review failure: preserve packet/branch, park without review,
  and execute the mandatory finally block.
- Valid NO-GO or split: preserve exact structured outputs, do not resample, and
  finish reporting before the mandatory finally block.
- Merge/live failure: use PD6 rollback/freeze semantics, never hand-edit overlay,
  then execute the mandatory finally block.
- POSTRUN failure: preserve the session log, then execute the mandatory finally
  block before any next run.
- iOS remains local-only throughout; no exception in this plan authorizes push.
