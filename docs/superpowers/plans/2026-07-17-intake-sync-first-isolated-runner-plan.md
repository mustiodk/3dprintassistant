# Intake Sync-First Isolated Runner Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Before implementation, use `superpowers:using-git-worktrees`; for each behavior change, use `superpowers:test-driven-development`; before completion claims, use `superpowers:verification-before-completion`.

**Goal:** Make production printer intake synchronize and run from a persistent automation-owned checkout so the owner's dirty/behind development checkout cannot block startup, then safely apply the approved i7 duplicate closure and Snapmaker U1 `U Series` re-entry.

**Architecture:** A stable installed bootstrap acquires an external lock, validates a dedicated clone, fetches and fast-forwards only a clean zero-ahead `main`, then executes the existing fail-closed wrapper from the updated checkout. Runtime repository paths become explicit. Owner decisions are persisted in validated ignored-state envelopes; terminal duplicate closure and U1 re-entry remain serial, auditable operations after a zero-candidate cutover proof.

**Tech Stack:** zsh/bash, Node.js 20 built-ins, git, launchd, existing intake validators and notifier, Claude Code headless runner, Bridge review gate.

**Global Constraints:** Preserve the design in [`2026-07-17-intake-sync-first-isolated-runner-design.md`](../specs/2026-07-17-intake-sync-first-isolated-runner-design.md). Never auto-stash/reset/clean/rebase arbitrary changes. Never weaken preflight, lock, freeze, review, live-verification, notification, or POSTRUN gates. Never rerun a parked candidate during infrastructure tests. Never push iOS or start/dispatch iOS 1.0.7/1.0.8. One independent review pass is the default; after material findings are fixed, stop if only minor polish remains. One review finding per commit. Web may be pushed only after final review and verification; the iOS checkout remains local-only and eight commits ahead unless a successful U1 mirror adds one local commit.

---

## Task 1: Build the fail-closed sync bootstrap

**Files:**

- Create: `scripts/intake-sync-bootstrap.sh`
- Create: `scripts/intake-sync-bootstrap.test.sh`

### Step 1: Write the failing shell integration test

Create temporary bare `origin`, development, and automation repositories. Stub the wrapper and notifier. Cover these exact cases:

- clean/current automation checkout → `SYNCBOOT ok=true reason=none`, wrapper count `1`;
- clean/behind by one remote commit → HEAD fast-forwards to `origin/main`, wrapper count `1`;
- dirty tracked and dirty untracked checkout → `reason=repo-dirty`, wrapper count `0`, bytes preserved;
- local-ahead → `reason=repo-ahead`, wrapper count `0`;
- diverged → `reason=repo-diverged`, wrapper count `0`;
- wrong branch → `reason=wrong-branch`, wrapper count `0`;
- wrong origin URL → `reason=wrong-origin`, wrapper count `0`;
- missing wrapper → `reason=wrapper-missing`;
- fresh external lock held → exit `75`, `reason=lock-held`, wrapper count `0`;
- external lock older than six hours → stale warning, atomic takeover, wrapper count `1`, replacement lock released at exit;
- separate development checkout dirty and behind while automation checkout is valid → wrapper count `1` and development bytes unchanged;
- wrapper exit `7` → bootstrap exits `7` and releases its lock.

Run: `bash scripts/intake-sync-bootstrap.test.sh`  
Expected: FAIL because `scripts/intake-sync-bootstrap.sh` does not exist.

### Step 2: Implement the minimal bootstrap

Implement zsh arguments:

```text
--repo <automation checkout>
--ios-repo <canonical iOS checkout>
--expected-origin <canonical origin URL>
--lock <external lock path>
--wrapper <wrapper path; defaults to <repo>/scripts/intake-run-wrapper.sh>
--path-prepend <test seam>
```

Rules, in order:

1. validate all required arguments and paths;
2. inspect an existing external lock by mtime: under six hours is an expected `lock-held` skip; at six hours or older, remove it with a stale warning, then use `noclobber` for atomic takeover (a takeover-race loser exits `75`); install EXIT/TERM/INT release traps immediately after acquisition;
3. require a clean worktree, branch `main`, expected origin URL, and wrapper file;
4. `git fetch origin main --quiet`;
5. compute `behind` and `ahead`;
6. refuse `ahead>0 && behind=0` as `repo-ahead`, and refuse both non-zero as `repo-diverged`;
7. for `behind>0 && ahead=0`, run only `git merge --ff-only origin/main`;
8. recheck clean, `main`, and `HEAD == origin/main`;
9. export `THREEDPA_INTAKE_REPO` and `THREEDPA_IOS_REPO`, invoke the updated wrapper with `--repo` and `--ios-repo`, and capture its status without replacing the bootstrap process;
10. print one terminal `SYNCBOOT ok=... reason=... detail=...` line, release the external lock through the EXIT trap, and propagate the wrapper's status.

Failure notification is best-effort through `<repo>/scripts/intake-notify.js` after the repository path is trusted; stderr remains the fallback. An external-lock collision is an expected skip and is logged but not notified.

### Step 3: Run and harden the tests

Run: `bash scripts/intake-sync-bootstrap.test.sh`  
Expected: all named cases pass.

Run: `zsh -n scripts/intake-sync-bootstrap.sh && git diff --check`  
Expected: exit `0`.

### Step 4: Commit

```bash
git add scripts/intake-sync-bootstrap.sh scripts/intake-sync-bootstrap.test.sh
git commit -m "feat(intake): add fail-closed sync bootstrap"
```

## Task 2: Make runtime repository paths explicit

**Files:**

- Modify: `scripts/intake-run-preflight.sh`
- Modify: `scripts/intake-run-preflight.test.sh`
- Modify: `scripts/intake-run-wrapper.sh`
- Modify: `scripts/intake-run-wrapper.test.sh`
- Modify: `scripts/validate-ios-printer-overlay.js`
- Modify: `scripts/validate-ios-printer-overlay.test.js`
- Modify: `scripts/republish-overlay.js`
- Modify: `scripts/republish-overlay.test.js`
- Modify: `scripts/intake-run-kickoff.md`
- Modify: `/Users/mustafaozturk-macmini/dev/Claude/Projects/ai-operating-model/docs/agents/intake-pipeline-runner.md`

### Step 1: Add RED path-contract tests

Add tests proving:

- preflight accepts `--ios-repo <path>` and uses that path instead of the hardcoded default;
- wrapper requires a value for `--ios-repo`, passes it to preflight, and exports `THREEDPA_IOS_REPO` to the Claude stub;
- `validate-ios-printer-overlay.js` and `republish-overlay.js` choose `<THREEDPA_IOS_REPO>/project.yml` when the environment variable is set, while explicit `--project` remains highest precedence for republish;
- kickoff contains no absolute web-checkout path, derives the web root from `$THREEDPA_INTAKE_REPO`/current working directory, and uses a repo-relative Bridge output directory;
- the runner contract uses `$THREEDPA_IOS_REPO` for mirror/validator commands and no longer assumes `../3dprintassistant-ios`.

Run:

```bash
bash scripts/intake-run-preflight.test.sh
bash scripts/intake-run-wrapper.test.sh
node --test scripts/validate-ios-printer-overlay.test.js scripts/republish-overlay.test.js
```

Expected: new assertions fail against hardcoded paths.

### Step 2: Implement the path seams

- Add validated `--ios-repo` parsing to preflight and wrapper.
- In wrapper, export `THREEDPA_INTAKE_REPO="$REPO"` and `THREEDPA_IOS_REPO="$IOS_REPO"`; call preflight with both explicit paths.
- Derive JavaScript default project path from `process.env.THREEDPA_IOS_REPO` when present, otherwise retain the current sibling default.
- Rewrite kickoff path text and its Bridge command to use the runtime repo/root without weakening its exact reviewer constraints.
- Advance the AI-OM runner contract to v2.5 with an additive “runtime paths” amendment. Every iOS mirror/validation path uses the environment variable; absence is a fail-closed configuration error in the scheduled lane.

### Step 3: Verify focused and regression suites

Run the three commands from Step 1, then:

```bash
node scripts/validate-ios-printer-overlay.js
node scripts/validate-reviewer-output.test.js
git diff --check
git -C ../ai-operating-model diff --check
```

Expected: all green; production validator resolves the canonical iOS project.

### Step 4: Commit separately by repository

```bash
git add scripts/intake-run-preflight.sh scripts/intake-run-preflight.test.sh \
  scripts/intake-run-wrapper.sh scripts/intake-run-wrapper.test.sh \
  scripts/validate-ios-printer-overlay.js scripts/validate-ios-printer-overlay.test.js \
  scripts/republish-overlay.js scripts/republish-overlay.test.js scripts/intake-run-kickoff.md
git commit -m "refactor(intake): make runner checkout paths explicit"

git -C ../ai-operating-model add docs/agents/intake-pipeline-runner.md
git -C ../ai-operating-model commit -m "docs(agents): make intake runtime paths explicit"
```

## Task 3: Add an audited owner-decision boundary

**Files:**

- Create: `scripts/intake-owner-decision.js`
- Create: `scripts/intake-owner-decision.test.js`
- Modify: `scripts/intake-run-kickoff.md`
- Modify: `scripts/intake-run-wrapper.test.sh`
- Modify: `/Users/mustafaozturk-macmini/dev/Claude/Projects/ai-operating-model/docs/agents/intake-pipeline-runner.md`

### Step 1: Write RED tests for both approved actions

Use temporary fixture copies of `data/printers.json`, the append-only ledger, and parked roots.

Duplicate resolution assertions:

- candidate and target IDs must match `[A-Za-z0-9._-]+`;
- the parked sidecar/packet candidate identity and SHA must match;
- target printer must exist exactly once (`sparkx_i7` in the real sanity check);
- `--dry-run` changes zero bytes;
- `--apply` appends a fresh correction line with the full original `candidateKey`, fresh `runId`, original `scoutOutcome`, `ownerResolution:"was-duplicate-missed"`, and `correctiveSignal:"modelSuffixStrip:ios-punctuation-artifact"`;
- the parked directory moves atomically to `resolved/<candidate>/<runId>/`, preserving packet SHA, and disappears from the active parked sweep;
- no catalog or overlay byte changes occur.

Series approval assertions:

- `--approve-series-group "U Series"` validates a non-empty normalized label and exact candidate identity;
- it updates `proposedTaxonomy.series_group` plus `printersJsonRow.series_group.value`, records an `intake-owner-decision@1` object with `action:"reenter"`, owner-approved timestamp and prior packet SHA, refreshes `candidateArtifact.sha256` to the new packet bytes, and sets `nextEligibleTrigger:"owner-approved"`;
- it does not change unrelated researched field metadata;
- a repeated identical approval is idempotent; a conflicting second label fails closed;
- the runner consumes only a valid owner-decision envelope for the matching candidate and never treats arbitrary sidecar text as approval.

Run: `node --test scripts/intake-owner-decision.test.js`  
Expected: FAIL because the module does not exist.

### Step 2: Implement the deterministic CLI/module

Support:

```text
node scripts/intake-owner-decision.js duplicate --candidate i7_i --duplicate-of sparkx_i7 [--dry-run|--apply]
node scripts/intake-owner-decision.js approve-series --candidate u1 --series-group "U Series" [--dry-run|--apply]
```

Default to `--dry-run`; `--apply` must be explicit. Accept fixture-path overrides for tests. Use same-filesystem rename for active-park → resolved archive. Never delete evidence. Print `OWNERDECISION ok=true|false action=... candidate=... changed=...`.

### Step 3: Wire the runner contract

Advance the AI-OM runner contract to v2.6 and update the kickoff's exact version reference. Add an exact stage-0b rule: `nextEligibleTrigger:"owner-approved"` is eligible only when the embedded decision schema/action/candidateKey/candidateId/prior SHA all validate. The runner applies only the declared `series_group`, materializes a new branch HEAD, runs the single-shot evidence gate and all normal PD5/live/custody/POSTRUN stages, and removes/archives the decision only after terminal custody. Invalid or conflicting decisions remain `decision-required` and spend zero review turns.

Pin the rule with kickoff token assertions in `intake-run-wrapper.test.sh`.

### Step 4: Verify and commit

Run:

```bash
node --test scripts/intake-owner-decision.test.js
bash scripts/intake-run-wrapper.test.sh
node scripts/intake-parked-store.test.js
git diff --check
git -C ../ai-operating-model diff --check
```

Commit web and AI-OM changes separately:

```bash
git add scripts/intake-owner-decision.js scripts/intake-owner-decision.test.js \
  scripts/intake-run-kickoff.md scripts/intake-run-wrapper.test.sh
git commit -m "feat(intake): persist validated owner decisions"

git -C ../ai-operating-model add docs/agents/intake-pipeline-runner.md
git -C ../ai-operating-model commit -m "docs(agents): define intake owner-decision reentry"
```

## Task 4: Build the idempotent installer and LaunchAgent cutover

**Files:**

- Create: `scripts/install-intake-runner.sh`
- Create: `scripts/install-intake-runner.test.sh`
- Modify: `scripts/launchd/dk.mragile.3dpa-intake.plist`
- Modify: `scripts/launchd/README.md`
- Modify: `docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md`

### Step 1: Write the failing installer test

In a temporary home/install root, prove:

- a fresh install clones `origin/main` to `<root>/checkout/3dprintassistant`;
- installed bootstrap is byte-identical to the tracked source and executable;
- rendered plist invokes `<root>/bin/intake-sync-bootstrap.sh`, passes the automation checkout, canonical iOS path, expected origin, and external lock, and uses an existing working directory;
- `--migrate-state-from <old repo>` copies only the enumerated ignored roots `.intake-runner-state/`, `.printer-intake-out/`, and `.printer-intake-runner.watermark.json` when present; source/destination SHA-256 manifests are identical;
- an existing conflicting destination file fails without overwrite;
- `--verify-only` changes zero bytes and reports checkout/remote/branch/bootstrap/plist/state-manifest status;
- repeat install is idempotent;
- tests use `--no-launchctl` and never touch the real LaunchAgent.

Run: `bash scripts/install-intake-runner.test.sh`  
Expected: FAIL because installer is absent.

### Step 2: Implement installer and tracked plist contract

Arguments:

```text
--source-repo <clean/current source>
--install-root <default ~/.local/share/3dpa-intake>
--ios-repo <canonical iOS checkout>
--expected-origin <URL>
--migrate-state-from <old web checkout; explicit one-time flag>
--verify-only
--no-launchctl <test seam>
```

Installation refuses a dirty, non-main, behind, ahead, or divergent source. It clones from the expected origin, installs bootstrap through a temporary file plus atomic rename, renders the plist through deterministic placeholder substitution, computes `shasum -a 256` manifests before/after state copy, and refuses any destination collision with unequal bytes.

Do not load or replace the real agent until the install verification passes. Document exact install, verify, cutover, kickstart, log inspection, and rollback commands in `scripts/launchd/README.md`. Add a new gate-ledger section whose rows are recorded only as commands actually complete.

### Step 3: Verify and commit

Run:

```bash
bash scripts/install-intake-runner.test.sh
plutil -lint scripts/launchd/dk.mragile.3dpa-intake.plist
git diff --check
```

Expected: green.

Commit:

```bash
git add scripts/install-intake-runner.sh scripts/install-intake-runner.test.sh \
  scripts/launchd/dk.mragile.3dpa-intake.plist scripts/launchd/README.md \
  docs/planning/INTAKE-AUTONOMY-V2-GATE-LEDGER.md
git commit -m "feat(intake): install isolated production checkout"
```

## Task 5: Run final implementation review and full verification

**Files:** all Task 1–4 changes in both repositories.

### Step 1: Run full relevant suites

```bash
bash scripts/intake-sync-bootstrap.test.sh
bash scripts/install-intake-runner.test.sh
bash scripts/intake-run-preflight.test.sh
bash scripts/intake-run-wrapper.test.sh
bash scripts/intake-post-run-invariants.test.sh
node --test scripts/intake-owner-decision.test.js scripts/validate-ios-printer-overlay.test.js scripts/republish-overlay.test.js
node scripts/intake-park-taxonomy.test.js
node scripts/intake-parked-store.test.js
node scripts/validate-candidate-evidence.test.js
node scripts/validate-reviewer-output.test.js
node scripts/validate-data.js
node scripts/validate-ios-printer-overlay.js
git diff --check
git -C ../ai-operating-model diff --check
```

Expected: all green.

### Step 2: Run one bounded cross-model implementation review

From the web repository:

```bash
bridge --health
bridge --mode claude-only "Review the implementation diff for the approved isolated sync-first intake plan. Return GO or NO-GO. Focus only on data-loss risk, fail-closed regressions, path/cutover correctness, owner-decision replay safety, and iOS push-gate violations. Ignore minor style/polish." --out-dir codex/intake-sync-first-review
```

Apply material findings one-per-commit, rerun only their focused tests, then perform at most one focused follow-up review. If the only remaining feedback is minor style/polish, stop the review loop and record it as non-blocking carry.

### Step 3: Re-run full verification and record evidence

Repeat Step 1 after the final material fix. Update the gate ledger with actual output summaries and commit the ledger-only evidence separately.

## Task 6: Merge/push the infrastructure, install it, and prove a zero-candidate run

### Step 1: Reconfirm live gates before mutation

```bash
git status --short --branch
git fetch origin main
git rev-list --left-right --count HEAD...origin/main
git -C ../ai-operating-model status --short --branch
git -C ../ai-operating-model fetch origin main
git -C ../ai-operating-model rev-list --left-right --count HEAD...origin/main
git -C ../3dprintassistant-ios status --short --branch
git -C ../3dprintassistant-ios rev-list --left-right --count main...origin/main
test ! -e i7_i
test ! -e scripts/.intake-autonomy-freeze
test ! -e scripts/.intake-run.lock
```

Expected: web/AI-OM changes intentional and review-clean; iOS clean/eight ahead; repo-root `i7_i` absent; no freeze/lock.

### Step 2: Land web and AI-OM code

Merge the reviewed web branch to web `main`, push web `main`, and push the reviewed AI-OM commits to its `main`. Do not touch iOS remote.

Verify:

```bash
git rev-parse main
git rev-parse origin/main
git -C ../ai-operating-model rev-parse main
git -C ../ai-operating-model rev-parse origin/main
```

Expected: pairs match.

### Step 3: Install and migrate state

Run the tracked installer from clean/current web `main` with:

```bash
scripts/install-intake-runner.sh \
  --source-repo "$PWD" \
  --install-root "$HOME/.local/share/3dpa-intake" \
  --ios-repo "$(cd ../3dprintassistant-ios && pwd)" \
  --expected-origin "$(git remote get-url origin)" \
  --migrate-state-from "$PWD"

scripts/install-intake-runner.sh \
  --source-repo "$PWD" \
  --install-root "$HOME/.local/share/3dpa-intake" \
  --ios-repo "$(cd ../3dprintassistant-ios && pwd)" \
  --expected-origin "$(git remote get-url origin)" \
  --verify-only
```

Expected: manifest match; dedicated checkout clean/current; bootstrap/plist checksums match.

### Step 4: Cut over LaunchAgent and run sync-only/no-candidate proof

Before kickstart, do not apply owner decisions. Run a deterministic Node check
over both dedicated-checkout sidecars that requires:

- exact paths `parked/i7_i/parked.json` and `parked/u1/parked.json`;
- `class:"decision-required"` and `nextEligibleTrigger:"owner"` on each;
- no embedded `ownerDecision` and no `owner-approved` trigger;
- candidate packet path and SHA still match each sidecar.

The check must print both candidate IDs/triggers and exit non-zero on any
missing, null, malformed, or eligible value. Record its output in the gate
ledger. Then create a temporary out-of-repo Scout report and require that its
candidate set is exactly the two parked packet names:

```bash
probe_dir="$(mktemp -d /tmp/3dpa-intake-cutover.XXXXXX)"
node scripts/printer-intake-scout.js --source kv --no-watermark --out "$probe_dir"
node - "$probe_dir/run-report.json" <<'NODE'
const fs = require('node:fs');
const report = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const actual = [...report.candidates].sort();
const expected = ['candidate-creality-i7_i.json', 'candidate-snapmaker-u1.json'];
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  throw new Error(`cutover candidate set mismatch: ${JSON.stringify(actual)}`);
}
console.log(`CUTOVER candidates-ineligible=${actual.join(',')}`);
NODE
```

Any additional candidate hard-stops the cutover proof so it cannot become an
unrelated intake run. Only then replace the loaded plist using the documented
bootout/bootstrap sequence and kickstart once. Remove the temporary probe
directory after recording the result.

Evidence required:

- `launchctl print` points at the installed bootstrap/dedicated checkout;
- `SYNCBOOT ok=true`;
- `PREFLIGHT ok=true`;
- fresh `last-run-report.md` reports zero candidates shipped/parked/errored;
- `POSTRUN ok=true`;
- dedicated checkout clean/current on `main`;
- both parked sidecar/packet SHA pairs unchanged;
- normal development checkout may be dirty without affecting the run;
- iOS remains clean and eight ahead.

Any failure: stop, preserve logs/state, and use the documented plist rollback. Do not continue to candidate actions.

## Task 7: Apply the approved i7 closure and U1 re-entry serially

All Task 7 commands run from the automation-owned checkout at
`/Users/mustafaozturk-macmini/.local/share/3dpa-intake/checkout/3dprintassistant`.
After cutover, that checkout owns parked/candidate state; the former development
checkout is not a state source and must not receive hand-copied updates.

### Step 1: Resolve i7 as the existing printer duplicate

First run the decision dry-run and inspect its machine summary:

```bash
node scripts/intake-owner-decision.js duplicate \
  --candidate i7_i --duplicate-of sparkx_i7 --dry-run
```

Expected: target resolves exactly to Creality `i7`, `series_group:"i Series"`; no data/overlay/iOS change proposed.

Apply, inspect the appended ledger line and resolved archive SHA, commit the ledger as its own custody commit, and push web `main`. Verify `sparkx_i7` remains live with `node scripts/verify-live-picker.js creality "i Series" sparkx_i7`. Do not run a printer ship or iOS mirror for this duplicate closure.

That custody push intentionally makes the normal development checkout behind.
Before manual development resumes there, fetch and integrate `origin/main`
safely: fast-forward only when its tree is clean and zero-ahead; if it is dirty
or ahead, surface the state and reconcile the owner work deliberately. The
automation run never pulls, stashes, resets, or cleans the development checkout.

### Step 2: Persist the approved U1 taxonomy decision

```bash
node scripts/intake-owner-decision.js approve-series \
  --candidate u1 --series-group "U Series" --dry-run
node scripts/intake-owner-decision.js approve-series \
  --candidate u1 --series-group "U Series" --apply
```

Verify the sidecar/packet decision envelope, prior/new SHA pair, and unchanged
unrelated evidence fields in place. Do not copy state back to or from the
development checkout.

### Step 3: Run one supervised candidate cycle

Kickstart the LaunchAgent once. The runner may process only the now owner-approved U1 candidate. Require all normal stages: branch materialization, diff guard, single-shot evidence gate, fresh R1 and R2 GO, merge/push, live overlay and picker verification, local-only iOS mirror, custody commit/push, KV hygiene, notify, POSTRUN.

Stop conditions:

- any evidence/reviewer/live/POSTRUN failure parks or freezes exactly as the current contract says;
- no same-run retry of a NO-GO or malformed review;
- no automatic processing of another parked candidate;
- no iOS push or TestFlight action.

### Step 4: Final product and repository proof

If U1 ships, verify:

```bash
node scripts/validate-data.js
node scripts/validate-ios-printer-overlay.js
node scripts/verify-live-picker.js snapmaker "U Series" u1
node scripts/verify-live-overlay.js u1
git status --short --branch
git -C ../3dprintassistant-ios status --short --branch
git -C ../3dprintassistant-ios rev-list --left-right --count main...origin/main
```

Expected: web clean/current; live U1 under Snapmaker/U Series; iOS clean and nine ahead only if the normal U1 mirror commit landed (otherwise still eight); no iOS push. Record the data/logic impact evaluation: U1 is additive catalog/overlay data, existing picker and remote-overlay surfaces consume it without engine/UI change; i7 closure is metadata/custody only.

## Cross-Model Plan Review

Independent Claude review through `bridge --mode claude-only` returned
**GO-WITH-PATCHES** on 2026-07-17. The material findings were accepted into
this plan:

1. bootstrap lock stale-TTL/takeover and regression coverage;
2. positive pre-kickstart proof that both parked candidates are still
   owner-ineligible, plus a no-unrelated-candidate check;
3. v2.6 contract/kickoff version traceability for the new owner-decision gate;
4. explicit post-custody-push sync guidance for the normal development
   checkout without reintroducing automatic mutation of that checkout.

No style/polish findings were requested or carried. Per owner instruction, the
plan-review loop stops here; implementation proceeds after focused self-checks.
