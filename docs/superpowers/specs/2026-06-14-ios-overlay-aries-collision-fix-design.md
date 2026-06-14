# Design spec — iOS overlay Aries-collision fix

- **Date:** 2026-06-14
- **Status:** REVIEWED — sub-agent adversarial review GO (no BLOCKER/HIGH); MEDIUM/LOW findings patched 2026-06-14. One disputed LOW (prior overlay version) rejected after git verification (`2284207` = `content_version 2026051202`).
- **Scope:** Web-only live fix + ship-gate hardening. One deferred iOS-binary follow-up.
- **Owner directive:** fix Aries-invisible-on-iOS; turn fix into spec → review → plan → gated execution.

---

## 1. Problem (proven)

Voxelab Aries is live on the web app and correct in the web bundled `data/printers.json`,
but is **not visible in the live iOS app (v1.0.4)**.

Ground-truth evidence collected 2026-06-14:

1. Live served overlay `https://3dprintassistant.com/catalog/ios-printer-overlay-v1.json`
   = `content_version 2026061301`, `enabled:true`, `min_app_version 1.0.3`,
   brands `[voxelab]`, **printers `[sparkx_i7, aries]`**, `payload_sha256` matches the
   in-repo file. Delivery and hash are fine.
2. The live build fetches exactly that URL (`Info.plist` key `PrinterCatalogURL`).
3. Shipped v1.0.4 bundled catalog (iOS `origin/main`) = 12 brands (no `voxelab`),
   **69 printers including `sparkx_i7`** (baked in at v1.0.4); `aries` absent.

## 2. Root cause

`PrinterCatalogProvider.validatePayload` (iOS) requires the **entire** remote printer
set to be disjoint from the bundled catalog:

```
guard bundledPrinterIds.isDisjoint(with: remotePrinterIds) else {
    throw PrinterCatalogError.duplicateIds   // PrinterCatalogProvider.swift:225
}
```

On v1.0.4 the bundled set already contains `sparkx_i7`, and the overlay still carries
`sparkx_i7` (alongside `aries`). The intersection is non-empty → `throw duplicateIds`
→ caught and swallowed in `fetchValidatedRemoteOverlay` → the **whole overlay is
dropped**, Aries included. The app falls back to bundled (i7 yes, Aries no).

This has been **latent since v1.0.4 went live (2026-06-04)**: the prior overlay
(`content_version 2026051202`, git `2284207` — verified by history; the earlier `0a4cc2f`
was `2026051201`) also carried `sparkx_i7`. On v1.0.4 that overlay was **also rejected
wholesale** by the same disjoint guard — but the rejection was *invisible*, because its only
printer (i7) was already bundled, so the fallback-to-bundled result was identical to a
successful merge. Collisions are never tolerated: any single colliding id drops the whole
overlay. Adding `aries` to the same overlay is what made that rejection user-visible.

## 3. Why the ship gate missed it

`scripts/validate-ios-printer-overlay.js` checks overlay-vs-bundled collisions against a
**single** baseline keyed by `overlay.min_app_version`:

```
const iosBaseline = iosBaselines[overlay.min_app_version];   // = "1.0.3"
...
if (bundledPrinterIds.has(id)) fail(...)                     // line 190
```

The baselines file (`catalog/ios-bundled-catalog-baselines.json`) currently has **only a
`1.0.3` key, with `sparkx_i7` absent** (i7 was overlay-only for 1.0.3). So the Node
validator compares against a baseline that predates i7-as-bundled, while the Swift runtime
compares against the actual **1.0.4** bundled catalog that *has* i7. The validator's view
went stale when v1.0.4 baked in i7 while `min_app_version` stayed `1.0.3`. Result: the
validator greenlights an overlay that the v1.0.4 runtime rejects.

## 4. Goals / non-goals

**Goals**
- G1. Make Aries visible on the live iOS app (v1.0.4) without a new binary.
- G2. Make the ship gate catch this collision class before publish, so it cannot recur silently.
- G3. Leave a clear durable hardening path for the iOS runtime (next binary).

**Non-goals**
- N1. No web app behavior change (Aries already correct on web; the web app does not
  consume the iOS overlay).
- N2. No iOS binary release in this change (push gate active; no full Xcode on this Mac).
- N3. No new overlay schema keys / no overlay-spec or Swift-validator schema change in the
  live fix (those would require a binary + a separate arc).

## 5. Design

### Part A — Live fix (web-only, unblocks v1.0.4 users)

Republish `catalog/ios-printer-overlay-v1.json` with:

- **Remove the `sparkx_i7` printer entry.** It is bundled in v1.0.4, so it no longer
  belongs in the overlay; its presence is the sole collision source. Keep the `voxelab`
  brand and the `aries` printer.
- **Keep `min_app_version: "1.0.3"`.** `aries` is not bundled in *any* shipped build
  (the bundled-aries iOS commit is local-only behind the push gate), so every current
  client — 1.0.3 and 1.0.4 alike — needs it via overlay, and `aries` collides with
  neither the 1.0.3 nor the 1.0.4 baseline.
- **Bump `content_version` → `2026061401`** (must strictly increase; the iOS poisoned-cache
  guard and the "newer-cached-wins" rule both rely on monotonic increase).
- **Recompute `payload_sha256`** over the new payload (canonical/stable stringify).

Post-change overlay payload = brands `[voxelab]`, printers `[aries]`.

**Trade-off (accepted by owner):** clients still on ≤1.0.3 lose the i7 overlay (i7 is not
bundled there). Under a single overlay file + the all-or-nothing Swift validator, it is
impossible to serve i7→1.0.3 *and* aries→1.0.4 simultaneously. v1.0.4 is the live build,
so aries-for-1.0.4 wins. The durable Swift fix (Part C) removes this constraint for the
future, but cannot reach already-shipped binaries.

### Part B — Gate hardening (web-only, same change)

Close the stale-baseline gap so the validator models what the *runtime* checks:

- **Add a `1.0.4` baseline** to `catalog/ios-bundled-catalog-baselines.json`, generated
  from the shipped v1.0.4 bundled catalog (iOS `origin/main`): 12 brand ids, 69 printer ids
  (= the 1.0.3 set ∪ `sparkx_i7`). Generate it programmatically, do not hand-type.
- **Validator checks collisions against every baseline with version ≥ `min_app_version`**,
  not just the `min_app_version` baseline. Concretely: build the union of `brand_ids` /
  `printer_ids` across all baseline keys `>= min_app_version`, and fail if any overlay id
  is in that union. This guarantees the overlay is safe on *every* targeted shipped build.
  - **Iteration robustness (review MEDIUM):** iterate `Object.keys(iosBaselines)` and
    **skip** any top-level key that is not strict `MAJOR.MINOR.PATCH` rather than letting
    `parseVersion`'s hard `fail()` abort the run on a stray key (e.g. a future `_comment`).
    Only union baselines whose key parses *and* is `>= min_app_version`. Note the baseline
    *value* objects carry a non-version `source` field — that lives inside the value, never
    treat it as a version.
- **Require a baseline entry for the current iOS `MARKETING_VERSION`.** The validator
  already reads `MARKETING_VERSION` (1.0.4). If no baseline exists for it, fail with a
  clear message ("add a bundled-catalog baseline for <version>"). This prevents the file
  from going stale unnoticed the next time a binary bakes in a printer.
- **Retain the existing `1.0.3` baseline.** With `min_app_version: "1.0.3"` and
  `MARKETING_VERSION: "1.0.4"`, the validator now requires **both** baselines present
  (1.0.3 for min_app_version, 1.0.4 for MARKETING_VERSION). Part B *adds* the 1.0.4 entry;
  it does not replace 1.0.3.

With Part B in place, the **current (unfixed) overlay would fail the validator** (i7 vs the
1.0.4 baseline) — i.e. the gate now reproduces the bug. Sequencing Part B before Part A in
the plan gives a gate-level RED→GREEN: B makes the validator fail on the old overlay, A
fixes the overlay to green.

### Part C — Durable iOS runtime hardening (DEFERRED to next binary, not in this change)

The all-or-nothing disjoint *guard* is the structural fault: one stale/colliding overlay
entry nukes the whole overlay. `mergedArray` already overrides-by-id, so the safe behavior
is to **drop the disjoint guard and let colliding ids be skipped/overridden** rather than
throw. This is the real defense and prevents recurrence when a future binary (e.g. v1.0.5)
bakes in `aries`.

Deferred because: it is an engine/Swift logic change (the data-only XCTest waiver does NOT
apply), it needs a real XCTest run (no full Xcode on this Mac), and it ships only via a
TestFlight binary (push gate). Tracked as a ROADMAP follow-up + a runbook lifecycle rule
(below). It is explicitly **out of scope for the live fix**.

### Part D — Process/runbook lifecycle rule (web-only docs, this change or follow-up)

Add to `docs/runbooks/printer-addition-protocol.md`: **when a printer graduates from
overlay → bundled in a new binary, remove it from the overlay and add a new
`ios-bundled-catalog-baselines.json` entry for that binary version at the same release.**
i7 should have been dropped from the overlay and given a 1.0.4 baseline when v1.0.4 went
live on 2026-06-04.

**Exact placement (review LOW):** this is an overlay→bundled *graduation* rule, so it lands
as a Phase 4 ("Deprecation / removal") sub-rule **and** a companion Phase 5 self-check
bullet so it is gate-enforced, not just narrative. The existing Phase forbids-list only
covers the inverse (adding to the overlay a printer not in bundled data); this adds the
missing graduation direction. Lands in **this change** (resolves Q1).

## 6. Test / verification strategy

- **Node overlay validator** (`validate-ios-printer-overlay.js`): RED on old overlay after
  Part B; GREEN after Part A.
- **Swift-parity simulation in Node**: replicate the Swift `validatePayload` disjoint +
  `merge` + decode against the *actual* shipped 1.0.4 bundled catalog (iOS `origin/main`)
  and the new overlay — assert (a) no collision, (b) merged catalog contains `voxelab` +
  `aries`, (c) shape decodes (all required printer fields present, types valid). This is the
  closest available proxy to the on-device path given no full Xcode here; call out that it
  is a proxy, not a real XCTest run.
- **Hash parity confirmation (review MEDIUM):** the live fix hinges on the recomputed
  `payload_sha256` validating on-device, so after recomputing the hash with the Node
  `stableStringify`, confirm it equals what the Swift `canonicalJSONString` /
  `canonicalPayloadHash` would compute. Parity is already *empirically established* — the
  current live overlay validates on-device and the aries-only payload uses identical value
  types (`null`, `false`, `0.4`, integer temps), so this is a **confirm-don't-discover**
  step: assert the canonical string / SHA-256 match (re-implement `canonicalJSONString` in
  the Node check, or cite the existing live round-trip as evidence). Watch the known risk
  classes: float formatting (`0.4`), `null` preservation, key ordering.
- **Web data gates** (per `docs/runbooks/profile-data-change-test-protocol.md`):
  `validate-data`, `picker-dry-run`, `walkthrough-harness`, `profile-matrix-audit` —
  **regression-sanity only; this change touches `catalog/` + `scripts/`, not web bundled
  `data/`**, so these prove no *incidental* regression rather than testing the fix itself.
  The non-waivable gate for an overlay change is `validate-ios-printer-overlay.js`.
- **Post-deploy runtime check (committed ≠ deployed)**: after web push, curl the live
  overlay URL and assert `content_version == 2026061401` and printers `== [aries]`.
- **On-device/sim check (best-effort)**: if a simulator running a 1.0.4-equivalent build is
  available, confirm Aries appears under Voxelab after the overlay applies. Note the
  two-launch propagation (see §7).

## 7. Caching / propagation behavior (set expectations)

Launch calls `refreshRemoteCacheForNextLaunch()` (writes the validated overlay to cache
only); the overlay is *applied* from cache by `applyCachedOverlayIfValid()` on the **next**
launch. So after republish, a v1.0.4 client sees Aries on the launch *after* the one that
re-caches. This is **at least one relaunch** — and possibly more: the re-caching fetch is a
fire-and-forget `Task(priority: .utility)` with a 2.0s fetch timeout
(`PrinterCatalogProvider.swift:95`), so a slow or interrupted launch can defer the cache
write further. "One relaunch" is the best case, not a guarantee. This is existing, intended
behavior.

## 8. Rollback

If the new overlay misbehaves, rollback is **republish with `enabled:false`** (and a
higher `content_version`), which reverts all clients to their bundled catalog. **Critical
subtlety (review LOW):** a disabled overlay *still runs the full `validatePayload` disjoint
check* — `validateOverlay` calls `validatePayload` unconditionally
(`PrinterCatalogProvider.swift:173`); only the merge-decode at line 174 is gated on
`enabled`. So the rollback overlay must *still be collision-free* (keep the aries-only
payload). Do **not** roll back by re-adding `sparkx_i7` + `enabled:false` — that overlay
would be rejected on v1.0.4 and the rollback would silently no-op (and re-hide Aries). Web
is git-revert + redeploy for the repo side.

## 9. Web + iOS impact evaluation (mandatory rule)

- **Web app:** no change. Aries is already correct in web bundled data and live on
  3dprintassistant.com. The web app does not read the iOS overlay.
- **iOS app (live, no binary):** overlay republish delivers Aries to v1.0.4 (and ≥1.0.3)
  clients via the existing remote-overlay path. No bundled-data change reaches users in
  this change.
- **iOS app (next binary):** Part C runtime hardening + (when a binary bakes in Aries)
  dropping Aries from the overlay + adding that binary's baseline.

## 10. Files touched (anticipated)

- `catalog/ios-printer-overlay-v1.json` (Part A)
- `catalog/ios-bundled-catalog-baselines.json` (Part B — add 1.0.4 entry)
- `scripts/validate-ios-printer-overlay.js` (Part B — multi-baseline + MARKETING_VERSION baseline guard)
- **required** validator self-test (Part B — review MEDIUM; e.g. `scripts/validate-ios-printer-overlay.test.js` + fixtures): assert (a) i7-bearing overlay → RED against a 1.0.4 baseline, (b) aries-only overlay → GREEN, (c) missing-MARKETING_VERSION-baseline → fail with the expected message
- `docs/runbooks/printer-addition-protocol.md` (Part D lifecycle rule — Phase 4 sub-rule + Phase 5 self-check bullet; lands in this change per Q1)
- `docs/planning/ROADMAP.md` + session log + INDEX + NEXT-SESSION (wrap)
- Deferred (NOT this change): `3DPrintAssistant/Services/PrinterCatalogProvider.swift` + an XCTest (Part C)

## 11. Open questions (resolved by review)

- Q1. **RESOLVED — same change.** Part D (runbook rule) lands in this web change as one
  docs commit; it is the process half of G2.
- Q2. **RESOLVED — required.** A committed self-test for the hardened validator is required
  (not optional) per the review MEDIUM; see §6 and §10.
- Q3. **RESOLVED — no second consumer.** The sub-agent review confirmed
  `validate-ios-printer-overlay.js` is the only reader of
  `ios-bundled-catalog-baselines.json`. The implementation gate will re-grep to confirm
  before changing the read shape.
