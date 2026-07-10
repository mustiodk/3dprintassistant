# Intake Autonomy v2 — Gate Ledger

**Plan:** [`../superpowers/plans/2026-07-10-intake-autonomy-v2-impl-plan.md`](../superpowers/plans/2026-07-10-intake-autonomy-v2-impl-plan.md) · **Spec:** [`../superpowers/specs/2026-07-09-intake-autonomy-v2-design.md`](../superpowers/specs/2026-07-09-intake-autonomy-v2-design.md)

Rules: ticks are recorded **as they happen, never pre-narrated**. Every row carries evidence (command output lines, commit SHAs, verbatim log lines). One row per gate exit; failure branches recorded verbatim.

| Gate | Status | Evidence |
|---|---|---|
| B0 launchd environment probe | ✅ 2026-07-10 | 4/4 PASS on a real launchd run (`ppid=1`); see B0 row below |
| B1 republish-overlay.js | ✅ 2026-07-10 | `c3abe4e` — 21/21 TDD, hostile GO-WITH-PATCHES ×8 applied, live-overlay no-op sanity clean; see B1 row |
| B2 live verification probes | ✅ 2026-07-10 | `cc9ba95`+`d1f84cd`+`bcdf510` — 25/25 probe tests, both probes green on real prod, refactor byte-for-byte; see B2 row |
| B3 preflight + lock/freeze + KV hygiene + notifier | ✅ 2026-07-10 | `b90dad0`→`461daf8` — 26 unit tests, real preflight `ok=true`, live KV dry-run deletes=0 kept=3; see B3 row |
| B4 contracts + PD7 + plist + dry-run | ⬜ | |
| B5 latency + rollback drill + enablement | ⬜ | |

---

## Rows (newest first)

### B3 — preflight + lock/freeze + KV hygiene + notifier ✅ (2026-07-10, `b90dad0` + `221541a` + `19ee6cb` + `461daf8`)

**Components:** `intake-runner.config.json` (liveVerify 10×30 uncalibrated; maxCandidatesPerRun 3; **schedule `daily 12:00` — owner-set this session, supersedes the plan's proposed 07:45**) · `intake-kv-hygiene.js` (14 tests) · `intake-notify.js` (12 tests) · `intake-run-preflight.sh` + `intake-run-wrapper.sh` · gitignore (freeze/lock/watermark/state-dir).
**Hostile review: GO-WITH-PATCHES ×14, all applied** — HIGH-1: zsh signal trap without exit meant a TERM'd run stripped the lock yet KEPT RUNNING (empirically verified by reviewer) → signal traps now exit, EXIT trap releases; HIGH-2: the wrapper's failure report hardcoded `shipped:0`, so crash-after-ship + webhook-down bypassed the PD8 shipped-and-unreported freeze → `--shipped-unknown` fail-closed path (unknown ship state + unreported ⇒ freeze); HIGH-3: hygiene classified by `scoutOutcome` but PD7 corrections mutate `ownerResolution` — a `was-mis-declined` requester record would still be deleted → correction-keep set (`was-mis-declined`/`was-brand-typo`/`was-suffix-variant` protect; `was-noise`/`was-duplicate-missed` deliberately confirm deletability); MEDIUM ×4: contact window base = max(key ts, `ledgeredAt`) (B4 write-side must emit `ledgeredAt`), digest cursor advances only on a DELIVERED digest, atomic noclobber lock acquire, skip-path recording (`last-skip.log`; **intended deviation: freeze/lock skips do NOT notify daily — the freeze creation already notified CRITICAL; ledgered here**); LOW ×7 incl. probe-key TTL, ship-vocab pinned (`shipped`/`auto-shipped`, no regex), allowed_mentions none, surrogate-safe truncation, **accepted decision: `last-run-session.log` + 300-char failure tails may carry requester-derived text — webhook channel stays owner-only, never widen the audience**, ambient-auth rule for hygiene `--apply` (**B4 contract items: emit `ledgeredAt`; hygiene runs ambient-auth; plist encodes 12:00**).
**QA:** 26/26 component tests; real preflight fail-closed on dirty tree + `ahead=11` (both correct), then **`PREFLIGHT ok=true` post-push on the real mini**; hygiene live dry-run `deletes=0 kept=3` (2 incomplete + staged K2 SE — exactly the plan's expectation; K2 SE KV key confirmed alive).

### B2 — live verification probes ✅ (2026-07-10, `cc9ba95` + `d1f84cd` + `bcdf510`)

**Refactor first (`cc9ba95`):** `scripts/lib/engine-bootstrap.js` extracted from `picker-dry-run.js` (loader + init-chatter capture + picker assertions); behavior-preserving proven **byte-for-byte** (picker-dry-run.test.js 7/7, output diff empty vs pre-refactor baseline).
**`verify-live-overlay.js` (`d1f84cd`):** FULL-envelope compare incl. `enabled` + `min_app_version` + hash **recomputed from the fetched body** (Codex MF-1 pinned by test: live `enabled:false` with matching version+hash FAILS ship-path verify); `--expect-disabled` PD8 mode; `--measure` machine line `MEASURE elapsed_seconds=… attempts=… version=…` (**runner contract note: grep for `MEASURE `, the CLI prefixes lines**); retries default 10×30s until B5 calibrates config (**`--retries N` = N TOTAL attempts**).
**`verify-live-picker.js` (`bcdf510`):** downloads live engine.js + all 9 init files into a temp root → shared bootstrap → same assertions as the local dry-run against PRODUCTION data. Exit contract both scripts: 0 ok / 2 mismatch / 3 fetch-or-init / 1 usage.
**Hostile review: GO-WITH-PATCHES ×9, all applied** — HIGH: garbage-200 engine.js crashed into exit 1 (usage collision) + leaked temp root → try/catch → exit 3 + IIFE .catch (empirically re-tested via HTML-200 fixture); HIGH: last-attempt-wins classification let a trailing network blip mask a REAL mismatch as exit 3 (runner would skip rollback) → deterministic any-observed-mismatch-wins + interleave test; MEDIUM ×3: committed-file self-consistency assert (hand-edited payload could false-PASS vs a stale live server), REQUIRED_FILES set-equality both directions (stale extra entry = false rollback), overlay test suite synthesized fixture (was built from the real catalog file — would red-out during a genuine PD8 emergency); LOW ×3 + OBSERVATION (MEASURE-prefix note above).
**QA:** 25/25 probe tests; real read-only prod runs green (overlay `OK attempts=1 elapsed=0.138s`; picker `GREEN sparkx_i7 under creality / i Series` on live data); full web suite 82/82.

### B1 — republish-overlay.js ✅ (2026-07-10, `c3abe4e`)

**TDD:** RED (module absent) → GREEN 17/17 → post-review 21/21. PD6 same-day rollback rule pinned twice (unit: bad `2026071002` + snapshot `2026071001` → `2026071003`; integration: rollbackTo above bad). Counter-99/2099 cap → exit **2** + `CRITICAL` (runner freeze-maps exit 2; ordinary failures exit 1 — both pinned).
**Hostile review: GO-WITH-PATCHES ×8, all applied** — HIGH: garbage `--bad-version` → `NaN || 0` silently zeroed the PD6 floor (rollback would republish AT the bad version, exit 0) → integer-validated at parse + `assertPublishable` NaN guard + CLI test; MEDIUM ×3: exit-code contract untested (now pinned 2-vs-1), crash-orphaned `.republish-tmp` would deadlock the B3 preflight (stale-cleanup + gitignore `catalog/*.republish-tmp`), no-op path silently discarded `--min-app-version`/`--add-brand` (now throws); LOW ×3: snapshot-file sanity check, machine-readable `changed=… version=…` stdout token, byte-diff test (bump changes only content_version+generated_at lines). One test flake fixed (same-millisecond `generated_at` collision).
**QA:** suite 21/21; full web suite 53 files pass/0 fail; live-overlay read-only sanity (`--snapshot` + idempotent no-op on `aries`, `git status` catalog clean).
**Discovered hazard (B3/B4 design input):** `printer-intake-scout.test.js:259,289` `rmSync`-recursive-deletes the REAL `scripts/.printer-intake-out/` — the standard QA command wipes anything stored there (it deleted the B0 probe logs mid-session; ledger had preserved the evidence verbatim). **Deviation adopted:** runner durable state (parked/, last-run-report.md) moves to a new gitignored `scripts/.intake-runner-state/`; `.printer-intake-out/` stays Scout-scratch only (re-derivable from KV). Plan's paths for these two artifacts are superseded accordingly.

### B0 — launchd environment probe ✅ (2026-07-10)

**Artifacts:** `scripts/intake-launchd-probe.sh` + `scripts/launchd/dk.mragile.3dpa-intake-probe.plist` (kickstart-only, `RunAtLoad false`). Probe logs live in the gitignored staging dir — evidence quoted verbatim here per plan B0.5.

**Run 1 (07:34Z, launchd `ppid=1`) — 2/4 PASS, failure branch (B0.4):**
```
FAIL claude-headless rc=1 output=Failed to authenticate. API Error: 401 Invalid authentication credentials
PASS wrangler-whoami (rc=0, account id present)
PASS bridge-health (rc=0)
error: src refspec 091d4b6cec63e750e277f2cef6d631901456a857efs/heads/intake-probe-scratch does not match any
FAIL git-push-probe push-failed
```
- **claude-headless 401 classified NOT structural:** reproduced in a scrubbed *terminal* env (`env -i`), so not a launchd/keychain-session problem — the standalone CLI's macOS keychain credential is stale (post-2026-06-17 token rotation). Remedy: source `~/.config/claude-code/oauth.env` (the `claude setup-token` artifact bridge already reads; verified valid → `PROBE_OK`). The env-token path is now the runner's canonical headless auth. **Owner note: the keychain entry itself stays stale until an interactive `claude /login`; oauth.env expiry is the real dependency (setup-token issued 2026-06-17).**
- **git-push-probe:** zsh `:r` modifier mangled the bare `$sha:refs/...` refspec → `${sha}` braced. Real bug, real catch.

**Run 2 (07:37Z, `ppid=1`) — 4/4 PASS** with remedies applied.

**Hostile review: GO-WITH-PATCHES ×8** (HIGH: this ledger was missing the failure-branch rows — fixed by this entry; MEDIUM: contradictory FAIL-then-PASS log when oauth.env missing → now counts as the probe's FAIL and skips the claude call; MEDIUM: non-idempotent scratch push after a failed delete → forced `+${sha}:` refspec; MEDIUM: plist Std\*Path pointed into the gitignored dir launchd can't create → moved to `~/Library/Logs/`; LOW ×3: token subshell-scoped away from probes 2–4, newline-flattened log snips, setup failure exits 78 EX_CONFIG; OBSERVATION → **B4 checklist item: `intake-run-wrapper.sh` must pin the same PATH + source the same oauth.env as the probe, or probe and runner envs drift**).

**Run 3 (07:43Z, `ppid=1`, patched script + plist) — 4/4 PASS:**
```
PASS claude-headless (rc=0, output contained PROBE_OK)
PASS wrangler-whoami (rc=0, account id present)
PASS bridge-health (rc=0)
PASS git-push-probe (scratch ref pushed + deleted)
=== probe done: 4/4 PASS
```

**Rollback:** `launchctl bootout gui/$UID/dk.mragile.3dpa-intake-probe` + `rm ~/Library/LaunchAgents/dk.mragile.3dpa-intake-probe.plist` (already booted out post-QA; plist copy left in `~/Library/LaunchAgents/` removed at bootout — re-run = `mkdir -p scripts/.printer-intake-out` → cp → bootstrap → kickstart).
