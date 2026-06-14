# Implementation plan — iOS overlay Aries-collision fix

- **Date:** 2026-06-14
- **Status:** REVIEWED — sub-agent plan review returned NO-GO (1 HIGH + 2 MEDIUM); all patched 2026-06-14. One LOW ("deploy is Pages not Worker") rejected after `wrangler.toml` verification (Workers + Assets: `main="worker.js"`, no `pages_build_output_dir`); stale "Pages" wording in `CLAUDE.md`/`3dpa-context.md` logged as an md-hygiene item for wrap.
- **Spec:** [`../specs/2026-06-14-ios-overlay-aries-collision-fix-design.md`](../specs/2026-06-14-ios-overlay-aries-collision-fix-design.md)
- **Scope:** Web repo (`3dprintassistant`) only. **No iOS repo write, no iOS binary, push gate not engaged.** One deferred iOS-binary follow-up (spec Part C).
- **Commit-boundary hold:** ACTIVE (set 2026-06-14) — commits/deploy only after per-gate QA green.

## Execution model (per owner directive)

Each gate runs: **execute → sub-agent review → patch findings → QA → if green, advance.**
A gate does not advance on yellow/red. Commits land per-gate (deliberate, under the hold).
Gate-to-commit map is in each gate. The web push + live-deploy verification is the final
gate; the hold is released only after the deploy is confirmed.

## Pre-flight facts (verified 2026-06-14)

- Live overlay served = `content_version 2026061301`, printers `[sparkx_i7, aries]`, brand `[voxelab]`.
- iOS `PrinterCatalogURL` (Info.plist) = `https://3dprintassistant.com/catalog/ios-printer-overlay-v1.json`.
- Shipped v1.0.4 bundled (iOS `origin/main`) = 12 brands (no voxelab), 69 printers (i7 present, aries absent).
- iOS `MARKETING_VERSION` = `1.0.4`. **Source = the LOCAL `../3dprintassistant-ios/project.yml`** (the validator reads the working tree at `iosProjectPath`, not a git ref; the local tree is 3 commits ahead of origin but the version reads `1.0.4` — confirm at execution). Baselines file has only a `1.0.3` key (no i7).
- Sole consumer of `catalog/ios-bundled-catalog-baselines.json` = `scripts/validate-ios-printer-overlay.js` (re-grep in Gate 1; confirmed in review — no `.js`/`.swift` second consumer).
- **Deploy model (verified via `wrangler.toml`):** Workers + Assets, git-connected — `main = "worker.js"`, `[assets] directory = "."`; **no** `pages_build_output_dir` (it is NOT Cloudflare Pages, despite stale "Pages" wording in `CLAUDE.md`/`3dpa-context.md`). Push to `main` triggers the git-connected deploy; `npx wrangler deploy` is the manual fallback. Gate 5 verifies the live result by curl regardless of path.
- **Validator is not unit-testable as written** — no `module.exports`, hardcoded paths (lines 7-10), `process.exit(1)` in `fail()` (line 88). Gate 1 must refactor it before the self-test can run (see Gate 1 step 0).

---

## Gate 1 — Harden the Node validator + add 1.0.4 baseline + required self-test

**Why first:** once the validator models the *runtime* (collisions vs all baselines ≥
min_app_version), it will RED-fail on the *current, unfixed* overlay (i7 vs the new 1.0.4
baseline). That transient RED is the proof the gate now catches the bug; Gate 2 turns it
GREEN. (Spec §5 Part B, §3.)

**Execute**
0. **Refactor the validator to be testable (review HIGH — REQUIRED first).** As written,
   `validate-ios-printer-overlay.js` has no `module.exports`, hardcodes its three input
   paths (lines 7-10), runs top-to-bottom on import, and `process.exit(1)`s in `fail()`
   (line 88) — so a fixture-driven self-test is impossible. Extract a pure
   `validateOverlay({ overlayPath, baselinesPath, projectPath })` that **returns** a result
   (`{ ok, error }`) or throws a typed error instead of `process.exit`, and keep a thin CLI
   wrapper (`if (require.main === module) { …call with the current hardcoded paths…;
   process.exit(ok?0:1) }`) so the existing CLI behavior and any current invocation are
   byte-for-byte preserved. `module.exports = { validateOverlay }`. This is a
   refactor-with-no-behavior-change; the existing CLI path must still pass on a good overlay.
1. Re-grep to confirm no second consumer of the baselines file:
   `grep -rn "ios-bundled-catalog-baselines" --include=*.js --include=*.swift .` (web + iOS).
2. Generate the `1.0.4` baseline entry **programmatically** from iOS
   `origin/main:3DPrintAssistant/Data/printers.json`: `brand_ids` (12), `printer_ids` (69),
   plus a `source` field citing the iOS commit. Append to
   `catalog/ios-bundled-catalog-baselines.json`; **retain the existing `1.0.3` entry**.
3. Modify `scripts/validate-ios-printer-overlay.js`:
   - Build the collision set as the **union of `brand_ids`/`printer_ids` across all baseline
     keys that parse as `MAJOR.MINOR.PATCH` and are `>= min_app_version`** (replace the
     single `iosBaselines[min_app_version]` lookup at lines 157/173/175).
   - **Robust key iteration:** skip non-version top-level keys instead of `parseVersion`
     hard-`fail()`. Do not treat the per-value `source` field as a version.
   - **Require a baseline for the current `MARKETING_VERSION`** (already read at line 145);
     fail with a clear "add a bundled-catalog baseline for <version>" message if absent.
   - Keep the existing `min_app_version` baseline-present check.
4. Add a **required** self-test `scripts/validate-ios-printer-overlay.test.js` that imports
   the refactored `validateOverlay()` with **fixture** baseline/overlay/project paths (plain
   Node asserts, like `picker-dry-run.test.js`). Cases:
   (a) i7-bearing overlay **passes** under a 1.0.3-only baseline set but **fails** once a
       1.0.4 baseline (with i7) is in the union — this proves the *union* logic is what
       catches the bug, not an incidental check (review NIT; verified: 1.0.3 baseline = 68
       printers without i7, 1.0.4 = 69 with i7);
   (b) aries-only overlay → GREEN under the 1.0.3+1.0.4 baseline union;
   (c) missing-MARKETING_VERSION-baseline → fail with the expected message.
   Each negative case asserts the specific error, and case (a)'s RED must be observed before
   the GREEN assertion (real RED-before-GREEN, not a trivially-passing test).

**Sub-agent review focus:** validator logic correctness (union, version compare of keys,
skip-not-fail on stray keys); baseline accuracy vs `origin/main`; test covers the three
cases and actually fails RED before asserting; no regression to existing validator checks
(hash, field allowlists, min_app_version present).

**QA / exit (all must be green):**
- Self-test passes (3/3).
- `node scripts/validate-ios-printer-overlay.js` run against the **current unfixed overlay**
  now **FAILS** with the i7-vs-1.0.4 collision message (expected transient RED).
- Baseline `1.0.4` entry matches `origin/main` exactly (diff the generated ids).

**Commit A:** `fix(overlay-validator): collide overlay ids against all baselines >= min_app_version + add 1.0.4 baseline + self-test` (web). **Coupling note (review LOW):** the validator refactor, the multi-baseline logic, the 1.0.4 baseline data, and the self-test are one coherent finding — the hardened validator is meaningless without the baseline it compares against, and the test asserts both — so they land together; the commit body states this rationale explicitly.

---

## Gate 2 — Republish the overlay (drop i7, bump version, recompute hash)

**Execute** (spec §5 Part A)
1. Edit `catalog/ios-printer-overlay-v1.json`: remove the `sparkx_i7` printer object; keep
   the `voxelab` brand + the `aries` printer; keep `enabled:true`, `schema_version:1`,
   `min_app_version:"1.0.3"`.
2. Set `content_version` → `2026061401` (strictly > 2026061301).
3. Recompute `payload_sha256` using the **same canonical stringify the validator/Swift use**
   (the publish path's `stableStringify` → SHA-256), so Node and Swift agree. Update
   `generated_at`.

**Sub-agent review focus:** payload now `brands:[voxelab]`, `printers:[aries]`; hash matches
recomputed canonical; content_version monotonic; no stray i7 reference; min_app_version
unchanged and correct; field shapes valid for the Swift sanitizer (required fields present,
enum values legal, `available_nozzle_sizes` non-empty).

**QA / exit:**
- `node scripts/validate-ios-printer-overlay.js` now **PASSES** (transient RED from Gate 1
  resolved).
- Self-test still 3/3.

**Commit B:** `fix(overlay): drop bundled sparkx_i7, publish aries-only overlay (content_version=2026061401)` (web).

---

## Gate 3 — Swift-parity + hash-parity + regression sanity (verification, no commit)

**Execute** (spec §6)
1. **Swift-parity simulation (Node):** replicate `validatePayload` disjoint + `merge` +
   decode against the *actual* shipped 1.0.4 bundled catalog (`origin/main`) and the new
   overlay. Assert: (a) no printer/brand collision, (b) merged catalog contains `voxelab` +
   `aries`, (c) every overlay printer field the Swift sanitizer requires is present and
   well-typed.
2. **Hash parity:** recompute `payload_sha256` independently; confirm it equals the value
   written in Gate 2; note that Node↔Swift canonical parity is already established in
   production (existing overlays validate on-device).
3. **Regression sanity** (unaffected, must stay green): `node scripts/validate-data.js`,
   `node scripts/picker-dry-run.test.js`, `node scripts/walkthrough-harness.js`,
   `node scripts/profile-matrix-audit.js`.

**Sub-agent review focus:** is the parity simulation faithful to the Swift code paths (not a
strawman)? Any field the Swift sanitizer would reject that the sim accepts? Are the
regression gates the right set?

**QA / exit:** parity sim green (no collision, merged has aries, decodes); hash matches;
regression gates green. No commit (verification only; sim script is ephemeral unless review
says commit it).

---

## Gate 4 — Runbook lifecycle rule (spec Part D)

**Execute**
1. In `docs/runbooks/printer-addition-protocol.md`: add a Phase 4
   ("Deprecation / removal") **graduation** sub-rule — when a printer goes overlay →
   bundled in a new binary, remove it from the overlay and add a
   `ios-bundled-catalog-baselines.json` entry for that binary version, same release. Add a
   companion **Phase 5 self-check** bullet, phrased as a checkable `[ ]` (review MEDIUM):
   e.g. "if a printer was bundled into a new binary this cycle, its overlay entry was
   removed AND a baseline added for the new binary version." Narrative-only wording is not
   acceptable — it must be a self-check item.

**Sub-agent review focus:** rule is unambiguous, placed correctly, consistent with the
existing forbids-list and self-check; no contradiction with current overlay-ops guidance.

**QA / exit:** doc diff reviewed; protocol internally consistent.

**Commit C:** `docs(runbook): overlay→bundled graduation rule + baseline upkeep` (web).

---

## Gate 5 — Push + live-deploy verification + release hold

**Execute**
1. Run the runbook **Phase 5 self-check** against this change's diff (review MEDIUM — this
   change is an overlay republish, so the protocol's self-check applies to it, including the
   new graduation bullet).
2. **Correct the stale ROADMAP truth (review MEDIUM).** The current ROADMAP (and the
   2026-06-14 session log) assert *"Voxelab Aries SHIPPED"* with overlay `2026061301` — but
   that overlay never reached live v1.0.4 users (the i7 collision dropped it). Rewrite the
   ROADMAP entry to state Aries was **published but not delivered** to v1.0.4 until this
   fix; mark Aries delivered **only after** the Gate-5 live curl confirms `2026061401`.
   (Commit ≠ deployed; published ≠ delivered.) This is itself a finding for wrap.
3. Push the web repo `3dprintassistant`. Per `wrangler.toml` this is a git-connected
   Workers + Assets deploy on `main`; if the live overlay does not flip within a few minutes,
   run `npx wrangler deploy` as the manual fallback.
4. **Committed ≠ deployed** — curl the live overlay and assert:
   - `content_version == 2026061401`
   - `payload.printers == ["aries"]`, `payload.brands == ["voxelab"]`
   - `payload_sha256` matches the served payload.
5. Best-effort on-device/sim check if a 1.0.4-equivalent build is available (note the
   ≥1-relaunch propagation).
6. **File the deferred Part C** as a row under ROADMAP **"Deferred / Parked Work"** (near the
   existing P3 `PrinterCatalogProvider` polish row): "Swift overlay validator — drop the
   all-or-nothing disjoint guard (skip/override colliding ids via `mergedArray`) + XCTest;
   needs an iOS binary."
7. **Release the commit-boundary hold** (`~/.claude/claude-sync.sh release`) once the deploy
   is confirmed.

**Sub-agent review focus:** n/a (ship gate) — but confirm the live curl evidence is recorded.

**QA / exit:** live overlay serves `2026061401` / aries-only; hold released; ROADMAP +
session log + INDEX + NEXT-SESSION updated at wrap.

---

## Deferred (NOT in this plan — tracked, needs an iOS binary)

- **Spec Part C — Swift tolerant merge.** Drop the all-or-nothing disjoint *guard* in
  `PrinterCatalogProvider.validatePayload`; rely on `mergedArray`'s override-by-id so a
  stale/colliding overlay entry is skipped, never nukes the whole overlay. Engine/Swift
  logic change → data-only XCTest waiver does **not** apply → needs a real XCTest run (no
  full Xcode on this Mac) and a TestFlight binary (push gate). File as a ROADMAP follow-up
  + an iOS XCTest. This is what prevents recurrence when a future binary bakes in `aries`.

## Risks

- R1. Node↔Swift hash canonicalization mismatch → overlay validates in Node but Swift
  rejects on-device. *Mitigation:* Gate 3 hash parity + established production parity;
  recompute with the same stringify the existing overlays use.
- R2. ≤1.0.3 clients lose the i7 overlay. *Accepted* (spec §5 Part A trade-off); 1.0.4 is
  the live build.
- R3. Transient validator RED between Gate 1 and Gate 2: after Commit A the committed tree is
  in a known-RED state (hardened validator + unfixed overlay). *Mitigation (review LOW):* the
  **commit-boundary hold keeps everything unpushed between A and B**, so the RED never leaves
  the local session — that, not merely "gates run in sequence," is the guarantee. Commit A
  and B must land in the same session (or be squashed if the session is interrupted) so
  `main` is never left RED.
- R4. Stale local iOS state (3 unpushed commits) is unrelated to this web fix; do not touch
  the iOS repo. *Mitigation:* scope is web-only.
