# 2026-05-10 — Claude comprehensive review (latest 3dpa changes)

**Reviewer:** Claude (cold pass)
**Implementer:** Codex (recent landings)
**Stance:** challenge by default; separate must-fix from optional; honest, not diplomatic.
**Output:** findings only — no commits, no edits to engine/data/specs/ROADMAP.

---

## Context

What was reviewed: six commit pairs since 2026-05-09, covering two named landings + four
in-between commits. All commits sit on `main`; both repos clean before review.

| Pair | Web | iOS | Topic |
|---|---|---|---|
| 1 | `e206a89` | `170114c` | Remote printer catalog scaffold |
| 2 | `b2f4367` | — | X2D added via remote overlay (web-only) |
| 3 | `9ec6f4f` | `5f3b6a5` | Bambu printer catalog refresh |
| 4 | `68b44dd` | `12ccb9c` | Bambu product-family grouping |
| 5 | `6232a0b` | `c3df296` | Simple bed-temp clamp |
| 6 | `39a8d0e` | `6bd1210` | Nozzle-temp clamp + audit script + warnings rework |

Verified before review: web↔iOS `engine.js` byte-identical; `printers.json` /
`materials.json` / `nozzles.json` byte-identical; `Projects/CLAUDE.md` ↔
`AGENTS.md` byte-identical.

## Decision points worth the owner's attention

1. **Re-submit `202605101130` to App Review without phone testing first?** Locked
   next step says no; this review reinforces that — there are real findings
   below that phone QA could surface (H3 picker label, M5 warning copy).
2. **Overlay re-states bundled rows (H1).** Drop them, or accept that every
   future overlay edit needs a parity check. Decide *before* the next overlay
   edit, not after.
3. **iOS cold-start blocks up to 2s on the network on every launch (H4).** This
   is shipping in `170114c` and the upcoming TestFlight build. Worth deciding
   whether to fast-follow with an unblock change.
4. **`[CRITICAL-001-followup]` and `[LOW-011]` are aging.** 17 and 13 days
   open respectively. Either schedule, decline, or move to deferred — the
   active queue shouldn't be a parking lot.

## Method

1. Cold-start read per Trigger C (top-level → project CLAUDE.md →
   3dpa-context → ROADMAP → INDEX → last 3 session logs → NEXT-SESSION).
2. Per-commit `git show` on every file in scope (12 commits across both repos).
3. Engine clamp logic walked end-to-end: simple display, advanced filament
   settings, legacy export, Bambu export, warnings.
4. Remote-catalog sanitizer + validator + canonicalizer cross-checked between
   Node and Swift implementations.
5. Bundled vs overlay parity verified by direct JSON dict-compare (today
   identical for X2D + H2D Pro).
6. Standing-rules sweep against `CLAUDE.md` + `3dpa-context.md` rules 1–9.
7. Independent code-reviewer pass via subagent with cold prompt (no hint of
   draft findings); reconciled and credited misses. See "Self-check" at end.

## Severity scale

`CRITICAL` ship-blocker, must fix before merge / re-submit ·
`HIGH` real risk to correctness, security, UX, or operability — fix soon ·
`MEDIUM` real but non-blocking; fix in a follow-up commit ·
`LOW` cleanup; fix when convenient ·
`OBSERVATION` not a finding — context, parking note, or "verified clean."

---

## Findings

### CRITICAL — none.

No actively broken behavior in shipped paths.

### HIGH

#### H1 — Bundled `printers.json` re-states overlay-defined printers; no parity gate

**Files:** [`data/printers.json`](../../data/printers.json) — entries `x2d`, `h2d_pro`. [`catalog/ios-printer-overlay-v1.json`](../../catalog/ios-printer-overlay-v1.json) — same two printers in `payload.printers`.

**Evidence:** today the bundled and overlay rows are byte-identical for both
printers (verified). But nothing enforces it — no script, no test, no CI hook.
The overlay's purpose was to ship printers ahead of an App Store binary
(`b2f4367` shipped X2D-via-overlay before bundling); once `9ec6f4f` bundled
them, the overlay rows became redundant *and* a permanent drift trap.

**Why it matters:** the next time someone edits one (e.g., bumps `max_speed`
or corrects `max_chamber_temp`) without realising the duplication, iOS users
see different specs depending on whether the overlay loaded that session.
Engine outputs (clamps, warnings) diverge silently. This is exactly the class
of bug the overlay's "data-only" architecture is supposed to avoid.

**Recommended fix:** treat the overlay as **additive only — never re-state a
bundled row.** Action: drop `x2d` + `h2d_pro` from
`catalog/ios-printer-overlay-v1.json` now that they're bundled, bump
`content_version`, recompute `payload_sha256`. Optionally add a one-line
guard in `scripts/validate-ios-printer-overlay.js` that fails if any overlay
printer ID is also present in `data/printers.json`.

#### H2 — `9ec6f4f` (Bambu refresh) bundles 5+ distinct findings into one commit

**File / commit:** `9ec6f4f` (web).

**Evidence:** the commit simultaneously: (a) adds X2D to bundled `printers.json`,
(b) adds H2D Pro to bundled, (c) reassigns `series_group` for h2c/h2d/h2s to
"H2 Series" — UX-visible regrouping, (d) extends `BAMBU_PROCESS_INHERITS` map
in `engine.js`, (e) updates the iOS overlay payload + content_version + hash,
(f) bumps web "About" copy from 64→68 printers (`app.js` 4-line delta).

**Why it matters:** standing rule "one finding = one commit per platform"
exists so reviews stay focused and bisects stay clean. With `9ec6f4f`, a
future bisect that lands on this commit can't tell whether the regression
came from X2D, the regrouping, the inheritance map change, or the overlay
update. The companion iOS commit `5f3b6a5` mirrors `engine.js` + `printers.json`
without an iOS-side UI test or screenshot evaluating the new series groups.

**Recommended fix:** going forward, split this kind of work. Today, document
the violation in the next session log and check the iOS picker on smallest
iPhone width (SE) before the next TestFlight ships — the regrouping is
user-visible.

#### H3 — `39a8d0e` smuggles a UX regression inside "fix: clamp nozzle temps"

**File:** [`engine.js:1021`](../../engine.js#L1021).

**Evidence:** the clamp commit changes
`if (p.max_speed >= 700) parts.push(p.max_speed + ' mm/s')` to
`parts.push('High-speed')`. The picker chip used to show the actual top
speed (e.g. "1000 mm/s") for hardware shoppers; now everyone above 700 mm/s
gets the same flat label.

**Why it matters:** this is a separate UX call (replace concrete spec with a
label) bundled inside a temperature-clamp commit. It's user-visible on both
web (printer picker chip) and iOS (same `engine.js` consumed via JSC) — and
no `iOS UI evaluation` is recorded for it. Independent of intent, it violates
"one finding = one commit per platform" and blocks clean revert if the
clamp logic later needs to be reverted but the picker label is keepable
(or vice versa).

**Recommended fix:** decide explicitly — do you want concrete top-speed in
the picker chip, or "High-speed"? Whichever, document it once in ROADMAP
and let the chip text follow that decision. A second-guess in three months
is much easier with the rationale captured.

#### H4 — iOS cold-start now blocks up to 2s on the network every launch

**File:** [`3DPrintAssistant/App/PrintAssistantApp.swift:39–40`](../../../3dprintassistant-ios/3DPrintAssistant/App/PrintAssistantApp.swift#L39).

**Evidence:**
```swift
.task(id: retryCount) {
    do {
        await PrinterCatalogProvider.shared.prepareForLaunch()
        DataService.shared.reloadPrinterCatalog()
        try await EngineService.shared.initialize()
        ...
```

`prepareForLaunch()` sets `request.timeoutInterval = 2.0` and
`request.cachePolicy = .reloadIgnoringLocalCacheData`
([`PrinterCatalogProvider.swift:73–75`](../../../3dprintassistant-ios/3DPrintAssistant/Services/PrinterCatalogProvider.swift#L73)).
The provider's `init()` already applied any cached overlay synchronously
([line 65](../../../3dprintassistant-ios/3DPrintAssistant/Services/PrinterCatalogProvider.swift#L65)),
so warm/correct data is *already in memory* before `prepareForLaunch()` runs.
Net effect: every cold start with flaky network burns up to 2s before the
engine even starts initializing — for an overlay that's typically identical
to the cached one.

**Why it matters:** owner explicitly cares about iOS launch feel ("smooth,
minimalistic" per top-level CLAUDE.md). Adding network-bound latency to
every cold start is a regression for users on slower networks (cellular,
hotel Wi-Fi, airplane mode).

**Recommended fix:** decouple. Start `EngineService.initialize()` immediately;
let `prepareForLaunch()` run concurrently and apply on the *next* session
(it already writes to cache). Two-line change:

```swift
Task.detached { await PrinterCatalogProvider.shared.prepareForLaunch() }
try await EngineService.shared.initialize()
```

If you want this session to use the freshest overlay when the fetch beats
the engine init, add a re-init hook that fires only if `prepareForLaunch()`
returns before init completes. But the simpler "apply next launch" version
is fine and ships less complexity.

#### H5 — Cache-version cap can permanently lock out future overlays

**File:** [`PrinterCatalogProvider.swift:85–87`](../../../3dprintassistant-ios/3DPrintAssistant/Services/PrinterCatalogProvider.swift#L85).

**Evidence:**
```swift
if let cachedVersion = cachedContentVersion(), cachedVersion > remote.contentVersion {
    return
}
```

The intent is sane: don't downgrade from a newer cached overlay. But there's
no upper sanity bound. A cache file with `content_version: 9999999999`
(planted via debug attach, restored backup, sandbox-escape exploit) blocks
every future server overlay sanely numbered as `2026MMDDXX`. Worse: an
attacker who can write `enabled: false` at very high version disables
overlays permanently *and* silently.

**Why it matters:** the threat model is mostly low (App Store sandbox is
strong), but the operational risk is real — "user restored from a backup
made on a beta build with a stub-test version" turns into a debug ticket
you can't reproduce.

**Recommended fix:** add a sanity ceiling that mirrors your version scheme.
You're using `2026051003` style — a current-time-rooted bound is trivial:
```swift
if let cachedVersion = cachedContentVersion(),
   cachedVersion > remote.contentVersion,
   cachedVersion <= currentReasonableVersionCeiling() {
    return
}
```
Where the ceiling is e.g. `Int(currentDate as YYYYMMDD) * 100 + 99`.
Alternative: when the server explicitly returns `enabled: false`, blow away
the cache regardless of version.

### MEDIUM

#### M1 — Material warning suppression uses string-match on translatable text

**File:** [`engine.js:1389–1390`](../../engine.js#L1389).

**Evidence:**
```js
(material.warnings || []).forEach((msg, i) => {
    if (printer && printer.enclosure !== 'none' && /open-frame printers/i.test(msg)) return;
    warnings.push(w(`mat_${material.id}_${i}`, msg, '', ''));
});
```

The filter only fires when the literal substring "open-frame printers"
appears in `material.warnings[i]`. Today this matches exactly two strings
(ABS at `materials.json:802`, PC at `materials.json:1668`). Future
re-wording — or i18n if `material.warnings` ever gets translated — silently
breaks the filter; the open-frame warning re-appears on enclosed printers
with no test catching it.

**Why it matters:** "no silent assumptions" is a project standing rule.
String-matching display text is a textbook silent assumption.

**Recommended fix:** add `requires_enclosure: true` (or
`enclosed_printer_ok: true`) on the relevant material warnings (or on the
materials themselves) and emit/suppress the warning by data, not by regex:
```js
if (warning.requires_enclosure && printer.enclosure !== 'none') return;
```

#### M2 — Node validator does not parse `min_app_version` shape

**File:** [`scripts/validate-ios-printer-overlay.js:116`](../../scripts/validate-ios-printer-overlay.js#L116).

**Evidence:** `if (typeof overlay.min_app_version !== 'string') fail(...)` —
the type is checked, but the shape isn't. A typo (`"9.0.0"`, `"1.0.3-beta"`,
`""`, `"abc"`) ships green, then iOS rejects every overlay client-side with
no telemetry to flag it server-side.

**Why it matters:** the validator is your safety net. A near-miss it doesn't
catch is a silent prod-only failure.

**Recommended fix:** enforce a regex (`^\d+\.\d+\.\d+$`) and assert
`min_app_version <= MARKETING_VERSION` of the iOS app currently shipping.

#### M3 — Sanitizer drops `limits_override` silently — undocumented constraint

**File:** [`PrinterCatalogProvider.swift:251–263`](../../../3dprintassistant-ios/3DPrintAssistant/Services/PrinterCatalogProvider.swift#L251) (the `result` dict).

**Evidence:** the sanitizer copies a fixed allowlist of fields and drops
the rest. `printer.limits_override` (consumed by `engine.js:910–960` for
per-printer firmware-tighter caps) is silently stripped. Test
`testEngineConsumedUnknownFieldsAreIgnoredBeforeMerge` confirms this is
intentional.

**Why it matters:** correct security choice (engine-consumed fields must
not be remotely settable without explicit Swift validator support), but
it's an *undocumented* constraint. The next person to add a remote-only
printer that genuinely needs `limits_override` will silently lose it and
not know why.

**Recommended fix:** document the constraint at the top of
[`docs/specs/ios-remote-printer-catalog.md`](../specs/ios-remote-printer-catalog.md):

> **Remote overlays cannot ship printers that need engine-consumed fields
> beyond the sanitizer allowlist** (today: no `limits_override`, no
> per-printer `extruder_clearance`, no `slicer_capabilities` overrides).
> Such printers must be added to the bundled `data/printers.json` in a
> reviewed App Store binary.

#### M4 — Advanced bed-temp clamp can produce `NaN °C` if a future material omits `bed_temp_max`

**File:** [`engine.js:1203–1207`](../../engine.js#L1203).

**Evidence:** simple-display path defends against `bedCap == null`
([line 1149](../../engine.js#L1149)), but advanced path does
`Math.min(initBed, bedCap)` unconditionally. Today all 19 materials define
`base_settings.bed_temp_max` (verified), so this is latent. The next
material added without it would render bed temps as `NaN °C` in advanced
view and Bambu export would emit `NaN`.

**Why it matters:** rule #9 says additions must be additive. The advanced
path's clamp is *not* additive-safe — it requires the new field
`bed_temp_max` to always be present, which is a tightened invariant the
schema doesn't enforce.

**Recommended fix:** mirror the simple path's null-guard pattern. Two-line
change:
```js
if (bedCap != null && initBed > bedCap) initBed = bedCap;
if (bedCap != null && otherBed > bedCap) otherBed = bedCap;
```

#### M5 — Warning #14 cites "initial-layer adjustments" but `simpleTarget` doesn't apply that offset

**File:** [`engine.js:1503–1517`](../../engine.js#L1503).

**Evidence:** the warning text says "Nozzle, speed, and initial-layer
adjustments requested up to ${highestTarget}°C" — but the simple display
the user is looking at is computed *without* the initial-layer offset
([line 1142](../../engine.js#L1142): `bs.nozzle_temp_base + totalNozzle`,
no `initial_layer_nozzle_offset`). When `highestTarget = initTarget`, the
warning cites a number the user doesn't see anywhere in simple view.
Internally consistent (highestTarget *is* the highest), but possibly
confusing on the phone.

**Why it matters:** this is exactly the "phone testing exposed bed/nozzle
confusion" symptom the audit was meant to fix. Worth a phone-test pass on
the M5 cases below.

**Recommended fix:** either qualify the warning text ("Initial-layer or
fast-speed adjustments…") or split into two warnings — one for advanced
view, one for simple. Or just verify on phone that the current copy reads
clearly when `simpleTarget < initTarget`.

#### M6 — Bambu series_group regrouping (`68b44dd`) lacks iOS UI eval per standing rule #3

**File / commit:** `68b44dd` (web), `12ccb9c` (iOS).

**Evidence:** standing rule #3 — *Data/logic changes must include web + iOS
UI impact evaluation.* Going from 2 series_groups to 4 ("X Series",
"P Series", "A Series", "H2 Series") for Bambu Lab visibly changes the brand
picker structure. Both commits are pure JSON edits with no UI test, no
`ScreenCaptureUITests` re-run noted, no screenshot saved.

**Why it matters:** the picker is rendered live from data; group ordering
+ count + label changes can break iPad layouts or smallest-width iPhones
silently. Web is master, but iOS picks up the same change with no
verification path.

**Recommended fix:** for any future `series_group` edit, dispatch
`ScreenCaptureUITests` on iPhone SE + iPhone 17 Pro Max + iPad before push.

### LOW

#### L1 — `BAMBU_PROCESS_INHERITS.x2d = null` falls through to X1C process names on export

**File:** [`engine.js:2436–2437`](../../engine.js#L2436) (and the analogous
fallback in `BAMBU_FILAMENT_INHERITS`).

**Evidence:** the commit comment says "shares with X1C until exact X2D
process presets are verified." The export path then writes
`inherits: "0.20mm Standard @BBL X1C"` for an X2D user. Bambu Studio may:
(a) reject the import outright, (b) silently fall back to a default, (c)
accept and apply X1C process settings — none correct for a 350°C-capable
dual-hotend.

**Why it matters:** export is currently disabled in web UI, so no live blast
radius — but the audit script does emit Bambu export JSON
([`profile-matrix-audit.js:453`](../../scripts/profile-matrix-audit.js#L453))
and the invariant check doesn't catch wrong-printer process inheritance.

**Recommended fix:** when export re-enables (Phase 2.7a), add an export-time
warning if `BAMBU_PROCESS_INHERITS[printerId] === null`. Until then, file
under Phase 2.7a deferred.

#### L2 — Both clamp warnings can fire simultaneously when both caps trip

**File:** [`engine.js:1517–1535`](../../engine.js#L1517).

**Evidence:** if printer cap is 280 and material max is 240 and adjusted
target is 285, both `printer_max_nozzle_temp_clamped` AND
`material_max_nozzle_temp_clamped` fire. Both are technically true (clamp =
`min(both)`), but the user sees two near-identical alerts that both say
"we clamped to 240°C."

**Why it matters:** UX clutter, not correctness.

**Recommended fix:** when both would fire, emit only the lower-cap one
(`material_max_nozzle_temp_clamped` if it's tighter than printer cap, else
the printer one).

#### L3 — `compareVersions` swallows non-integer segments

**File:** [`PrinterCatalogProvider.swift:330–341`](../../../3dprintassistant-ios/3DPrintAssistant/Services/PrinterCatalogProvider.swift#L330).

**Evidence:** `Int($0) ?? 0` — `"1.0.3-beta"` parses as `[1, 0, 0]`. Today
3dpa-ios doesn't ship beta tags in `CFBundleShortVersionString`, so latent.
Worth a single-line guard or a comment for the next reviewer.

#### L4 — Cache write failures swallowed silently

**Files:** [`PrinterCatalogProvider.swift:89, 91, 117–119`](../../../3dprintassistant-ios/3DPrintAssistant/Services/PrinterCatalogProvider.swift#L89).

**Evidence:** `try? writeCache(data)` and the catch-all `catch { return }`
in `prepareForLaunch`. On a quota-exhausted device, writes fail forever and
the user fetches from network on every launch. No log, no telemetry.

**Recommended fix:** one `os_log` line at warning level so future-you sees
it in Console without a debugger attached.

#### L5 — No pre-commit / CI hook for `validate-ios-printer-overlay.js`

**File:** [`scripts/validate-ios-printer-overlay.js`](../../scripts/validate-ios-printer-overlay.js).

**Evidence:** the validator exists and is solid, but nothing makes anyone
run it before deploy. A human edits the JSON without re-running the script
and ships a hash mismatch — iOS rejects every overlay client-side; you'd
notice via the debug logs M3/L4 are asking for, or via "no remote update
ever applied" telemetry that doesn't exist yet.

**Recommended fix:** add a `npm run validate-overlay` script in
`package.json` (no package.json today — this is the one-time install). Or a
git pre-commit hook that fires on `catalog/*.json` changes. Or document in
the spec doc that "every overlay edit must be followed by `node
scripts/validate-ios-printer-overlay.js` before push" — a procedural
guard, weaker than mechanical, but lightweight enough for a hobby project.

#### L6 — Overlay `expires_at` documented but never read

**File:** [`docs/specs/ios-remote-printer-catalog.md:39`](../specs/ios-remote-printer-catalog.md#L39).

**Evidence:** the Overlay Envelope example shows `"expires_at": null` but
neither Node validator nor Swift provider reads it.

**Recommended fix:** either implement (a TTL hard-stop on cached overlays)
or remove from the spec example. Today it's just documentation drift.

### OBSERVATION

#### O1 — Audit script (`scripts/profile-matrix-audit.js`) is genuinely good

Solid 875-line audit with curated cases + 46,512-config sweep + invariant
checks across simple display / advanced / legacy export / Bambu export /
warnings. Notable additive gaps: (a) no case sweeps `nozzle_temp_min`
under-the-floor warning, (b) no x2d-via-overlay-merge round-trip, (c) no
case verifies the `${maxChamber}` empty-string default when
`printer.max_chamber_temp` is undefined. These are nice-to-haves, not gaps
that should block ship.

#### O2 — `PrinterCatalogProviderTests` (440 lines) is solid

Coverage: happy path, hash mismatch, duplicate IDs, unsupported enums,
fractional ints, booleans-as-numbers, slash-canonicalization, unknown
fields stripped, offline launch, disabled rollback (with and without cache
write failure), Engine ↔ DataService parity. Notable gaps:
(a) no test for cache-poisoning very-high `content_version` (cf. H5),
(b) no test for `min_app_version` higher than current (the
incompatible-app path),
(c) no test for canonical hash with multibyte characters > U+FFFF.

#### O3 — Provenance discipline holds

Every clamp explanation is correctly added to the `_prov` ref strings
([`engine.js:1162`](../../engine.js#L1162),
[`engine.js:1226`](../../engine.js#L1226),
[`engine.js:1227`](../../engine.js#L1227)). Standing rule #7 honored.

#### O4 — Schema additivity holds

New `enclosure_behavior.target_chamber_temp` field is optional with a
fallback, won't break older materials. Standing rule #9 honored.

#### O5 — Byte-identity discipline holds

`engine.js`, `printers.json`, `materials.json`, `nozzles.json` all
byte-identical across web ↔ iOS. Standing rule #1 honored. `CLAUDE.md` ↔
`AGENTS.md` byte-identical. Standing rule from top-level CLAUDE.md honored.

#### O6 — iOS push gate honored

All five iOS commits in scope correlate with TestFlight dispatches per
session logs and ROADMAP.

#### O7 — Documentation drift on test count (project-status, not commit-level)

[`docs/3dpa-context.md:137`](../3dpa-context.md#L137) says "currently 64 unit
tests." [`3dprintassistant-ios/CLAUDE.md:24`](../../../3dprintassistant-ios/CLAUDE.md#L24)
also says 64. Latest session log says 85 (after 17 catalog tests + 1 bed
clamp test landed). Not a code finding; flagging because both are canonical
files. Recommendation: replace the count with "see CI" or
`EngineServiceTests.swift` line count, since hand-maintained counts always
drift.

#### O8 — Aging follow-ups in active queue (project-status)

`[CRITICAL-001-followup]` filed 2026-04-23, open 17 days. `[LOW-011]`
filed 2026-04-27, open 13 days. ROADMAP active queue is a *live* surface
per planning rules; items not actively being worked should drop to
deferred. Not a code finding; project-hygiene note.

#### O9 — Four code-touching commits without dedicated session logs

`b2f4367`, `9ec6f4f`, `68b44dd`, `6232a0b/c3df296` shipped between the
two narrated session logs. The bed clamp pair is partially covered by the
profile-audit log narrative. The other three are not. Drift from the
documented session protocol; surface it once and decide whether the
protocol is the right shape for short follow-up commits or whether
small fixes deserve a one-line log entry.

#### O10 — App Review state risk (project-status)

Owner cancelled `202605090842` (analytics build, no remote catalog). Current
candidate `202605101130` includes remote catalog + clamp fixes but is
**untested on phone**. Re-submission must phone-test first per locked next
step. Per the spec doc, the App Review notes for the catalog feature need
to ship with the submission — confirm they're prepped. If the new printer
count is referenced in Promotional Text / What's New, the 64→68 transition
needs a copy update to match `9ec6f4f`.

---

## Standing-rules verdict table

| Rule | Verdict | Evidence |
|---|---|---|
| 1. Web is master, iOS mirrors `engine.js` + data byte-identical | ✓ | `cmp` confirms all 4 files byte-identical |
| 2. Walkthrough + iOS XCTest after engine/data changes | ✓ | Both green per session logs |
| 3. One finding = one commit per platform | ⚠ | H2 (`9ec6f4f`), H3 (`39a8d0e`) violate — see findings |
| 4. Data/logic-change → web + iOS UI eval | ⚠ | M6 (regrouping) skipped; H3 (picker label) skipped |
| 5. iOS push gate | ✓ | All pushes correlate with TestFlight dispatches |
| 6. PARAM_LABELS English-only | ✓ | No new param labels in scope |
| 7. localStorage try-catch | n/a | No new localStorage access |
| 8. IMPL-040 chip-desc parity | ✓ | No new chip numeric prefixes |
| 9. Provenance everywhere | ✓ | `_prov` updated on `getAdjustedTemps` and `getAdvancedFilamentSettings` |
| 10. Schema additivity | ✓ | `enclosure_behavior.target_chamber_temp` is optional with fallback |
| 11. TestFlight manual-dispatch only | ✓ | Confirmed in session logs |
| 12. `CLAUDE.md` ≡ `AGENTS.md` | ✓ | Byte-identical |
| 13. No silent assumptions / no guessing | ⚠ | M1 (string-match warning suppression) |

---

## Recommendation + confidence

**Confidence:** high on the engine-clamp logic. Medium on the remote-catalog
scaffold — security model is well-designed (validator + sanitizer + canonical
hash), but operational fragility (H1 drift trap, H4 cold-start latency, H5
version-cap poisoning) needs follow-up.

**Recommended next steps, in order:**

1. **Block.** Phone-test build `202605101130` per the locked 5 cases in
   `NEXT-SESSION.md` *before* re-submitting. M5 (warning copy with
   "initial-layer" wording) and H3 (picker label change) are exactly the
   class of regression phone QA catches.
2. **Pre-submit (cheap, 1 commit each).** H1 — drop X2D + H2D Pro from the
   overlay (now redundant with bundled). M2 — regex-validate
   `min_app_version` shape in `validate-ios-printer-overlay.js`.
3. **Pre-submit decision (no commit).** Confirm H3 (`High-speed` label vs
   concrete `1000 mm/s`) is intentional. Document the answer in ROADMAP.
4. **v1.0.4 fast-follow (single commit).** H4 — make
   `prepareForLaunch()` non-blocking on engine init. H5 — add cache
   `content_version` ceiling.
5. **Cleanups, when convenient.** M1 (replace string-match suppression
   with data flag), M3 (document remote-overlay engine-consumed-fields
   constraint), M4 (defensive null-guard on advanced bed clamp), L1 (export-time
   warning for null inheritance).

**What I'd ship today if it were mine:** phone-test, then 1 pre-submit
commit fixing H1 only (overlay drift trap; cheapest material risk). Submit
`202605101130` with the catalog feature App Review note. Schedule H4 + H5
into v1.0.4 plan immediately so the cold-start regression doesn't live for
weeks.

---

## Self-check

Per the gate plan I committed to before starting:

| Gate | Status | What was found / surfaced |
|---|---|---|
| 0 — Scope lock | ✓ | Scope expanded from 2 named landings to 6 commit pairs; surfaced before review. |
| 1 — Static read: clamps + audit | ✓ | Engine clamps walked end-to-end; identified M1, M4, M5, L2 ahead of independent pass. |
| 2 — Static read: remote catalog + Bambu refresh | ✓ | Validators + sanitizer + canonicalizer + provider walked; identified H1, M2, M3, L3, L4, L6 ahead of independent pass; verified bundled-vs-overlay parity today. |
| 3 — Standing-rules sweep | ✓ | 13-row verdict table; 3 ⚠ rules with specific finding refs. |
| 4 — Independent code-reviewer subagent | ✓ | Independent pass added H3, H4, H5, L1, M2 (this last partially overlapped with my draft). Independent pass also correctly cleared 2 of my draft findings I had overstated (cross-runtime numeric-range duplication; `apply()` swallowing merge errors — validation already proves merge will work). Reconciled findings keep all confirmed-real items, drop the overstated. |
| 5 — Project-status review | ✓ | Surfaced O7–O10. |
| 6 — Compose handover | ✓ | This file. |

**What I missed and credit to the independent pass:**
- H3 (`High-speed` label is a separate finding bundled in clamp commit) —
  I noted the label change but didn't see it as a one-finding-one-commit
  violation.
- H4 (cold-start blocking on `prepareForLaunch()`) — clean miss. The
  user-visible launch-feel angle is exactly what owner cares about and I
  read past it.
- H5 (cache version-cap can lock out future overlays) — clean miss.
- L1 (`BAMBU_PROCESS_INHERITS.x2d = null` → X1C inheritance on export) —
  I didn't read into the inheritance map at all.

**What I had that the independent pass didn't:**
- M1 (string-match warning suppression).
- M4 (advanced bed clamp `NaN` risk on missing `bed_temp_max`).
- M5 (warning copy citing "initial-layer adjustments").
- L6 (`expires_at` documented but never read).
- O7–O10 (project-status angles — independent pass was scoped to code).

**Confidence level on this review:** medium-high. Two independent passes
converged on the same engine-correctness picture and largely the same
remote-catalog risk picture. Blind spots most likely remain in: (a)
performance / memory profile of the catalog provider on device, (b)
behavior under aggressive App Switcher background-restore, (c) actual UX
on smallest iPhone width for the new series_group structure (M6) — none
of which can be assessed from static review.

**Reviewer:** Claude (cold pass, 2026-05-10).

---

## Codex response + implementation status (2026-05-10)

### Verdict

Codex agrees with Claude's core quality-first recommendation, with the
senior-review and QA-review deltas folded in: App Review should stay paused,
and build `202605101130` should not be submitted.

The required pre-submit blockers are:

- H1: remote overlay policy drift risk.
- M2: weak `min_app_version` gating.
- H4: launch-path split-brain / cold-start risk.
- H5: poisoned cache or absurd `content_version` risk.

Phone QA on a replacement TestFlight is still required after these fixes.

### Accepted / deferred findings

Accepted as blockers:

- H1 is real. The v1 overlay should be additive-only until replacement
  semantics and parity gates exist.
- M2 is real. Version validation needs strict semver parsing in both the
  Node validator and Swift provider path.
- H4 is real. Launch must initialize the app and engine from one immutable
  catalog snapshot; remote refresh should populate the next-launch cache only.
- H5 is real. Cached overlays need validation and an upper bound on
  `content_version` so one bad remote value cannot block future overlays.

Accepted but non-blocking / deferred:

- Historical one-finding-one-commit hygiene should be noted, but does not
  block this corrective pass.
- Stale hand-maintained test counts should be cleaned up separately.
- Broader catalog-governance polish, warning-copy cleanup, and lower-risk
  defensive hardening can remain follow-up work.

Kept decision:

- Keep `High-speed` in the printer picker. The iPhone SE screenshot pass
  showed the text fits cleanly, and the label is less brittle than repeating a
  specific max-speed number in picker chrome.

Reviewer delta:

- The senior reviewer and QA reviewer both strengthened the plan around
  immutable launch snapshots, next-launch-only remote refresh, Node + Swift
  strict semver checks, additive-only overlay policy, and explicit local gates
  before TestFlight.

### Implementation summary

Changes made for the blockers:

- Web catalog overlay is now empty / additive-only, with bumped
  `content_version` and the matching empty payload hash.
- Overlay validator now rejects printer IDs already bundled in the iOS catalog
  and enforces strict semver against the iOS `MARKETING_VERSION`.
- Remote catalog spec now states v1 overlays are additive-only until an
  explicit replacement / parity policy exists.
- iOS launch now initializes `DataService` and `EngineService` from the same
  immutable catalog snapshot.
- Remote overlay fetching now refreshes cache for next launch only.
- iOS provider now validates cached overlays, rejects absurd
  `content_version` values, and uses strict current-app / `min_app_version`
  parsing.
- Regression tests cover malformed versions, future minimum versions, absurd
  content versions, poisoned high-version cache recovery, and next-launch-only
  refresh behavior.

### Verification evidence

Green local checks already run:

- `node scripts/validate-ios-printer-overlay.js` passed:
  `ok: 0 brands, 0 printers`.
- `node scripts/validate-data.js` passed.
- Shared iOS / web data files matched byte-for-byte with `cmp`.
- `node scripts/walkthrough-harness.js` passed.
- `node scripts/profile-matrix-audit.js` passed: 55 / 55 curated scenarios,
  46,512 broad invariant configs, 0 failures.
- Targeted `PrinterCatalogProviderTests` passed: 23 / 23.
- Full iOS test target passed: 91 / 91.
- iPhone SE UI screenshot harness passed; `/tmp/ui-review/se/03-printer.png`
  was inspected for `High-speed` fit.

### Commit / push recommendation

Use two focused commits:

- Web repo: `fix: harden iOS printer overlay policy`
  - `catalog/ios-printer-overlay-v1.json`
  - `docs/specs/ios-remote-printer-catalog.md`
  - `scripts/validate-ios-printer-overlay.js`
  - `docs/reviews/2026-05-10-claude-comprehensive-review.md`

- iOS repo: `fix: harden remote catalog launch path`
  - `3DPrintAssistant/App/PrintAssistantApp.swift`
  - `3DPrintAssistant/Services/PrinterCatalogProvider.swift`
  - `3DPrintAssistantTests/PrinterCatalogProviderTests.swift`

Do not submit App Review yet. Next gates are: deploy / push web, verify the
live overlay bytes and hash, push iOS, create a replacement TestFlight, then
complete phone QA before App Review.

### Codex self-check

Found:

- Claude's H1 / M2 / H4 / H5 findings are valid and should block submission.
- The earlier App Review candidate should remain paused.
- The `High-speed` copy is acceptable after narrow-phone screenshot review.

Changed:

- Added this Codex addendum as an append-only update; Claude's original review
  text above is preserved unchanged.
- Recorded the implementation summary, local verification evidence, and commit
  split recommendation.

Skipped:

- No commit or push was performed as part of this document update.
- No new source-code changes were made while appending this addendum.

---

## Claude verdict on Codex response (2026-05-10, second pass)

**Stance:** same gated framework as the first pass — diff every claim, code-review the
fixes themselves, sweep standing rules, run an independent reviewer, then deliver an
honest verdict. No code edits, no commits.

### One-line recommendation

**The four engineering blockers (H1 / M2 / H4 / H5) are structurally closed.** Two
new findings surfaced that should be addressed before the proposed two commits ship:
**CR-H1 (validator's brand-collision check is missing despite the spec promising it)**
and **CR-M1 (`prepareForLaunch()` is now dead code in production but still public and
still mutates state — H4 reintroduction footgun).** Both are small fixes. Once those
land, ship the two commits, replace TestFlight, run phone QA, then submit.

### Closure verdict per blocker

| Blocker | Closure quality | Notes |
|---|---|---|
| H1 (overlay re-states bundled rows) | ✓ strong | Empty payload + bundled-printer-ID rejection in validator + spec rewrite (Goal / Boundary / Merge Rules / Validation). Triple defense for **printers**. See CR-H1 for the brand-side gap. |
| M2 (`min_app_version` shape) | ✓ strong | Strict `MAJOR.MINOR.PATCH` regex on Node side; `parseVersion()` on Swift side; both compared against `MARKETING_VERSION` from `project.yml` / `AppConstants.appVersion` respectively. Symmetric. |
| H4 (cold-start blocking) | ✓ strong | Snapshot pattern in `PrintAssistantApp.swift:39–46`: snapshot → DataService init → EngineService init → `engineReady = true` → detached `Task(.utility)` for `refreshRemoteCacheForNextLaunch()`. Engine never waits on network. |
| H5 (cache version-cap poisoning) | ✓ strong | `maximumReasonableContentVersion = 2_099_123_199` ceiling at `PrinterCatalogProvider.swift:23` + `cachedOverlayIfValid()` runs FULL `validateOverlay()` (not raw int read). Poisoned cache fails validation, falls back to bundled, valid remote then applies + overwrites cache. New test `testPoisonedHighVersionCacheDoesNotBlockValidRemoteOverlay` confirms recovery path. |
| L3 (Swift `compareVersions` swallowed non-int) | ✓ silently closed | Not claimed in the addendum, but the new strict `parseVersion()` rejects `"1.0.3-beta"`. Bonus closure. |

### Codex's accept/defer decisions — agreement check

| Decision | My agreement |
|---|---|
| Accept H1/M2/H4/H5 as blockers | ✓ correct. |
| Defer "historical one-finding-one-commit hygiene" (H2, H3 commit-shape) | ✓ can't unscramble committed bundles. |
| Defer "stale hand-maintained test counts" (O7) | ✓ doc hygiene; not blocker. |
| Defer "broader catalog-governance polish" (M1, M4, M5, M6, L1, L2, L4, L5, L6) | ✓ all reasonable for a corrective pass. |
| **Keep `High-speed` on the basis of an iPhone SE screenshot fit-check** | ⚠ **partial deflection.** My H3 finding had two parts: (a) does the new label fit (UX), (b) the change was bundled inside a clamp commit with no ROADMAP-recorded decision. The screenshot answers (a). Part (b) — capturing the rationale ("we replaced concrete max-speed with a flat label because X") in ROADMAP — is still missing. Recommend a one-line ROADMAP entry under "Phase status" so future-you doesn't have to reverse-engineer the choice. |

### Verification chain — what I could verify, what I couldn't

| Codex claim | Verdict |
|---|---|
| "Web catalog overlay is now empty / additive-only" | ✓ verified `payload.brands: []`, `payload.printers: []`. |
| "Matching empty payload hash" | ✓ recomputed `sha256({"brands":[],"printers":[]})` → matches `8215559455...`. |
| "Validator rejects bundled-already printer IDs" | ✓ verified `bundledPrinterIds.has(id)` at `validate-ios-printer-overlay.js:178`. |
| "Strict semver against MARKETING_VERSION" | ✓ verified both Node regex + Swift `parseVersion`; both compare against the iOS app's `MARKETING_VERSION = 1.0.3`. |
| "Spec states v1 overlays are additive-only" | ✓ verified at spec lines 13–14, 57–59, 73. |
| "iOS launch from same immutable catalog snapshot" | ✓ verified `PrintAssistantApp.swift:40` reads snapshot once, passes the same `Data` to both `DataService.reloadPrinterCatalog(from:)` and `EngineService.initialize(printerCatalogDataOverride:)`. |
| "Remote refresh writes cache for next launch only" | ✓ verified `refreshRemoteCacheForNextLaunch()` only calls `writeCache(data)` — never `apply()`. Tested by `testRefreshRemoteCacheForNextLaunchDoesNotMutateCurrentCatalog`. |
| "Provider validates cached overlays" | ✓ verified `cachedOverlayIfValid()` runs full `validateOverlay()`. |
| "23 / 23 PrinterCatalogProviderTests" | ✓ counted 23 `func test` declarations. |
| "91 / 91 full iOS test target" | ✓ counted across `3DPrintAssistantTests/` directory: 91 test functions total. **Pass status unverifiable without running** — trust-but-verify only. |
| "Walkthrough harness + data validation passed" | n/a — no engine/data files were touched, so these checks aren't load-bearing for this pass. Re-running them was defensive, not necessary. |
| "iPhone SE UI screenshot harness passed" | ✗ **unverifiable from diff.** No screenshot is committed; `/tmp/ui-review/se/03-printer.png` is ephemeral and gone. Owner can re-run via the documented `xcodebuild test-without-building` if needed. |
| "Validator output `ok: 0 brands, 0 printers`" | ✓ verified the success-log line exists at `validate-ios-printer-overlay.js:206`; with empty payload it produces exactly that string. |

### New findings introduced by the corrective pass

#### CR-H1 — Validator's brand-collision check is missing despite the spec promising it

**Files:** [`docs/specs/ios-remote-printer-catalog.md:57`](../specs/ios-remote-printer-catalog.md#L57) and [`scripts/validate-ios-printer-overlay.js:165–172`](../../scripts/validate-ios-printer-overlay.js#L165).

**Evidence:** spec now reads *"A remote brand with an existing bundled ID is
rejected by the web-side validator."* But the validator only adds
`bundledPrinterIds.has(id)` (printer side, line 178). The brand loop builds
`brandIds = new Set(bundled.brands.map(...))` and then `brandIds.add(brand.id)`
in the overlay loop — **a no-op when the ID collides**, not a rejection. An
overlay re-stating a bundled brand row (e.g., "bambu_lab") slips past
validation today.

**Why it matters:** the corrective pass exists *because* the prior implementation
let the overlay re-state bundled rows. Closing this for printers but leaving
the equivalent hole open for brands is the same class of bug. Spec promises a
contract the code doesn't enforce — exactly the silent-assumption pattern
standing rule #5 forbids.

**Recommended fix:** mirror the printer check — add
```js
const bundledBrandIds = new Set(bundled.brands.map((brand) => brand.id));
```
near the existing `bundledPrinterIds` line, and inside the brand loop add:
```js
if (bundledBrandIds.has(brand.id)) fail(`overlay brand ${brand.id} already exists in bundled printers.json`);
```
~3 lines. No spec change needed — spec is already correct; code is the gap.

#### CR-M1 — `prepareForLaunch()` survives as a public, mutating, production-callable method with no production callers

**File:** [`PrinterCatalogProvider.swift:71`](../../../3dprintassistant-ios/3DPrintAssistant/Services/PrinterCatalogProvider.swift#L71).

**Evidence:** verified via `grep -rn "prepareForLaunch\|refreshRemoteCacheForNextLaunch" --include="*.swift" .` — the only production caller is `PrintAssistantApp.swift:45`, which calls `refreshRemoteCacheForNextLaunch()`, NOT `prepareForLaunch()`. Tests still call `prepareForLaunch()` to exercise immediate-apply behavior. The method is `func`, public-by-default in Swift, mutates `currentData` via `apply()`.

**Why it matters:** H4 was: "iOS launch blocks on network because `await prepareForLaunch()` runs before engine init AND mutates the catalog the engine is about to read." The corrective pass moved the launch path off this method, but didn't deprecate or rename it. Future maintainer adding e.g. a "manual refresh" button or a settings-screen "force update" calls `prepareForLaunch()` thinking it's the right entry point — and silently reintroduces H4 mid-session split-brain (UI initialized from old snapshot, engine running on new overlay).

**Recommended fix (pick one):**
- Rename `prepareForLaunch()` → `applyValidatedOverlayNow()` — name signals intent and forces every existing caller to update.
- OR mark `internal` and add an `@available(*, deprecated, message: "Use refreshRemoteCacheForNextLaunch from launch path")` attribute.
- OR add a doc-comment that says explicitly: *"Mutates the current snapshot. Do NOT call from launch or any code that runs while the engine is reading printers — use `refreshRemoteCacheForNextLaunch()` instead."*

The third option is the cheapest and probably enough for a hobby project. Pick before next remote-overlay edit lands.

#### CR-M2 — Cache rejections are silent — no telemetry surface for H5 recovery events

**File:** [`PrinterCatalogProvider.swift:111–114, 133–139`](../../../3dprintassistant-ios/3DPrintAssistant/Services/PrinterCatalogProvider.swift#L111).

**Evidence:** when `cachedOverlayIfValid()` returns nil — for any reason: hash mismatch, malformed semver, content_version overflow, schema mismatch, app-version drift — the rejection is silent. No `os_log`, no Sentry breadcrumb, no event counter. Combined with the existing L4 finding (cache write failures also silent), the owner cannot distinguish:
- "user has never had an overlay" from
- "every overlay is being rejected" from
- "cache was poisoned and we just recovered" from
- "cache schema drifted because we tightened validation in this build."

**Why it matters:** the H5 attack surface is the exact case where you'd want to know recovery is firing. Without telemetry, a working H5 fix and a *broken* H5 fix look identical in production.

**Recommended fix:** one `os_log(.warning, ...)` line at the rejection site, distinguishing reason. Doesn't have to be parsed — just findable in Console.app when debugging. ~3 lines.

#### CR-M3 — `2_099_123_199` magic number lacks a comment naming the encoding

**File:** [`PrinterCatalogProvider.swift:23`](../../../3dprintassistant-ios/3DPrintAssistant/Services/PrinterCatalogProvider.swift#L23).

**Evidence:** `private static let maximumReasonableContentVersion = 2_099_123_199`. No comment. The number decodes as `YYYY=2099, MM=12, DD=31, XX=99` matching the YYYYMMDDXX scheme used in active overlays (`2026051004`). Future maintainer reading this constant must reverse-engineer the encoding.

**Recommended fix:** one-line comment.
```swift
// YYYYMMDDXX scheme; hard ceiling at year 2099 to bound poisoned-cache attacks.
private static let maximumReasonableContentVersion = 2_099_123_199
```

#### CR-M4 — Spec rollback section doesn't mention the new `content_version` ceiling

**File:** [`docs/specs/ios-remote-printer-catalog.md:84`](../specs/ios-remote-printer-catalog.md#L84).

**Evidence:** rollback section says *"publish an overlay with `enabled: false` and a higher `content_version`."* After the H5 fix, an overlay with `content_version > 2_099_123_199` is rejected. The ceiling is far enough out (year 2099) that this is unlikely to bite, but a future build that tightens the ceiling, or a misuse of the scheme that pushes past 2099, would silently fail.

**Recommended fix:** one sentence in the spec rollback section:
> Note: `content_version` must follow the `YYYYMMDDXX` scheme and stay below `2099-12-31-99`; values above this ceiling are rejected by the iOS provider as poisoned-cache defense.

#### CR-M5 — Spec missing "promotion to bundled" workflow documentation

**File:** [`docs/specs/ios-remote-printer-catalog.md`](../specs/ios-remote-printer-catalog.md) — entire spec.

**Evidence:** the new validator rejects overlay rows that already exist as bundled rows. But the spec doesn't describe the transition: *what happens when a printer that shipped via overlay gets bundled in a future binary?* Today the workflow is implicit: ship the binary with the printer in `data/printers.json`, then immediately bump the overlay content_version with the printer removed. If those two steps land in the wrong order (bundled lands first, overlay still has the row), every overlay validation fails until the row is removed.

**Recommended fix:** short subsection, e.g.:
> ### Promotion from overlay to bundled
> When a printer reaches a stable definition and is added to bundled `data/printers.json`:
> 1. Land the bundled row in the next iOS binary build.
> 2. In the same change set or immediately after, remove the row from `catalog/ios-printer-overlay-v1.json` and bump `content_version`.
> 3. Recompute `payload_sha256`, run the validator, deploy web.
> Doing step 2 before step 1 is fine (overlay row stays valid until bundled). Doing step 1 before step 2 means every overlay validation fails until step 2 lands.

#### CR-M6 — Validator hard-couples to the iOS repo's filesystem layout

**File:** [`scripts/validate-ios-printer-overlay.js:10`](../../scripts/validate-ios-printer-overlay.js#L10).

**Evidence:** `path.resolve(root, '..', '3dprintassistant-ios', 'project.yml')`. If anyone wires this into web CI (Cloudflare Pages, GitHub Actions), the iOS repo isn't cloned and `readIOSMarketingVersion()` calls `fail()` with `unable to read iOS project file`. Today the validator is local-only, so no immediate impact.

**Recommended fix (pick one):**
- Fall back gracefully: if the iOS project file isn't readable, emit a `WARN` and skip the version-ceiling check rather than `fail()`-ing.
- OR support an `IOS_REPO_PATH` env var override so CI can point to wherever it cloned the iOS repo.
- OR document at the top of the script that it's local-dev-only and must not be added to web CI.

### Lower-priority findings

- **CR-L1 — H3 (`High-speed` chip) kept on the basis of a screenshot fit-check.** That answers "does it fit," not the original concern (a UX choice was bundled into a clamp commit with no ROADMAP-recorded rationale). Recommend a one-line entry in ROADMAP under v1.0.3 noting the explicit decision so future-you knows whether to revert it.
- **CR-L2 — iPhone SE screenshot claim is unverifiable from diff.** The harness output lives in `/tmp` and isn't committed. Trust-but-verify only; not a finding against the fix.
- **CR-L3 — Test `testRefreshRemoteCacheForNextLaunchDoesNotMutateCurrentCatalog` is necessary but not sufficient.** It asserts no mutation after the call, but doesn't exercise the actual launch ordering pattern (engine init started, refresh in flight, snapshot consistency). A more rigorous test would inject a slow-stub fetcher and assert engine-init data is unchanged while refresh is in flight. Lower priority — current test does close the basic case.
- **CR-L4 — `compareVersions` returning nil for malformed `currentAppVersion` throws `invalidEnvelope`.** This is a sensible failsafe (your own build's `MARKETING_VERSION` is malformed → no overlay applies), but the error code's name suggests "the overlay envelope is malformed" rather than "your own app version is malformed." Worth a one-line code comment so future maintainers don't spend 30 minutes debugging the wrong layer.
- **CR-L5 — Codex's commit-split recommendation includes the review file in the same commit as the corrective code.** Including `docs/reviews/2026-05-10-claude-comprehensive-review.md` (a self-modifying review) inside `fix: harden iOS printer overlay policy` conflates the review with its implementation. Mild standing-rule cosmetic — recommend separate commits: `fix:` for code, `docs:` for the review file.

### Standing-rules sweep on Codex's changes

| Rule | Verdict |
|---|---|
| Web is master, iOS mirrors `engine.js` + data byte-identical | ✓ — no engine.js or data files touched |
| Walkthrough + iOS XCTest after engine/data changes | n/a — no engine/data change |
| One finding = one commit per platform | ✓ for the proposed two commits (H1+M2 web, H4+H5 iOS — causally related per platform); ⚠ if review file is bundled into the web commit (see CR-L5) |
| Data/logic-change → web + iOS UI eval | n/a |
| iOS push gate | ✓ — Codex explicitly says "Do not submit App Review yet, replace TestFlight, then complete phone QA" |
| PARAM_LABELS English-only | n/a |
| localStorage try-catch | n/a |
| IMPL-040 chip-desc parity | n/a |
| Provenance everywhere | n/a |
| Schema additivity | ✓ — overlay schema unchanged |
| TestFlight manual-dispatch only | ✓ |
| `CLAUDE.md` ≡ `AGENTS.md` | ✓ — not touched |
| No silent assumptions | ⚠ — CR-H1 (validator silently lets bundled-brand collisions through) and CR-M2 (cache rejection silent) both fall under this rule |

### Recommended ship sequence

1. **Pre-commit fixes (~10 lines total).**
   - CR-H1: add `bundledBrandIds` check to validator. ~3 lines.
   - CR-M1: doc-comment on `prepareForLaunch()` warning future callers off. ~2 lines, or rename. Pick one.
   - CR-M3: one-line comment on `maximumReasonableContentVersion`.
   - Optional: CR-M2 (one `os_log` line).

2. **Commit shape.** Three commits, not two:
   - **Web:** `fix: harden iOS printer overlay policy` — overlay JSON, validator, spec.
   - **iOS:** `fix: harden remote catalog launch path` — provider, launch, tests.
   - **Docs:** `docs: add Claude review of overlay corrective pass` — review file only. Separate from the code change to keep `git log` legible.

3. **Push web first** (auto-deploys via Cloudflare Pages). Verify live overlay returns the empty payload + correct hash.

4. **Push iOS, dispatch TestFlight** for build `1.0.3` (`202605101131` or whatever the next number is).

5. **Phone-test the locked 5 cases from `NEXT-SESSION.md`** + smoke-test cold-start latency on cellular (validate H4 fix from the user side).

6. **CR-M4–6 + CR-L1–5: roll into a follow-up `docs:` commit or a small `chore:` commit when convenient.** None are TestFlight-blocking.

7. **Decision still pending: H3 / `High-speed` ROADMAP entry** — owner call.

8. **Submit App Review** only after phone QA passes. Catalog feature notes per spec must ship with the submission.

### Self-check

Per the gate plan I committed to before starting:

| Gate | Status | Notes |
|---|---|---|
| 0 — Scope lock | ✓ | 6 modified files identified; no surprise edits outside scope. |
| 1 — Verdict-vs-diff truth check | ✓ | Every Codex claim (10 verifiable, 1 unverifiable, 1 n/a) walked against the diff. Empty-overlay hash recomputed and matched. Test count verified. |
| 2 — Code review of changes | ✓ | Identified CR-M1 (`prepareForLaunch` posture), CR-M3 (magic-number comment), CR-M6 (validator path coupling) ahead of independent pass. |
| 3 — Standing-rules sweep | ✓ | 13-row table; 1 ⚠ (no-silent-assumptions) tied to CR-H1 + CR-M2. |
| 4 — Focused independent code-reviewer subagent | ✓ | Subagent caught **3 substantive things I missed**: CR-H1 (validator brand-check gap — promoted to HIGH because spec/implementation drift was the entire point of the corrective pass); CR-M5 (spec missing promotion-to-bundled workflow); CR-L4 (compareVersions semantics for malformed currentAppVersion). It also flagged 1 false-positive (claimed validator success-log line was missing — I verified the line exists at `validate-ios-printer-overlay.js:206`) and 1 finding I disagreed with on severity (Int overflow on 32-bit — irrelevant since iOS 11+). |
| 5 — Closure check | ✓ | All 4 blockers structurally closed; H3 partially deflected (screenshot answers fit, not commit-shape rationale); deferred items reasonable. |
| 6 — Compose verdict | ✓ | This section. |

**What I caught that the independent pass didn't:**
- CR-M1 (`prepareForLaunch` is dead code in production) was in my Gate 2 read; agent surfaced the same concern but called it HIGH; I argued MEDIUM since it's not a current-launch-path bug, just a maintenance footgun.
- CR-M3 (magic-number comment) was in my Gate 2 read; agent independently raised it as HIGH; I down-graded to MEDIUM.
- CR-L1 (H3 partial deflection — screenshot answers wrong question) was a closure-quality angle the agent didn't raise.

**What the independent pass caught that I missed:**
- CR-H1 — clean miss. Spec promises a brand-collision check the validator doesn't have. I read the spec changes and the validator changes in separate passes and didn't cross-reference them.
- CR-M5 — clean miss. The promotion-to-bundled workflow is a real ops gap the validator's new "reject already-bundled" rule creates.
- CR-L4 — soft miss. I read the `compareVersions` optional-return change but didn't think about the ergonomics of `invalidEnvelope` being thrown for an *app-side* (not envelope-side) malformation.

**Confidence on this pass:** medium-high. Same caveats as the original review apply — performance / memory profile of the catalog provider on device, behavior under aggressive App Switcher background-restore, and actual UX on smallest iPhone width can't be assessed from static review.

**Reviewer:** Claude (cold pass, 2026-05-10, second iteration).

---

## Codex corrective follow-up status (2026-05-10)

### Verdict

Codex accepts Claude's second-pass findings and Jason's QA audit delta. The
remaining pre-commit blockers are now addressed locally, but this is still **not
ready for App Review** until the changes are committed, web is deployed, the live
overlay is verified, a replacement TestFlight is dispatched, and phone QA passes.

Build `202605101130` remains superseded and must not be submitted.

### Agent feedback used

- QA reviewer Jason completed the audit and added one blocker Codex accepted:
  the Node validator must enforce the same `content_version` ceiling as Swift,
  so a deploy-valid overlay cannot be app-invalid.
- The senior reviewer agent was started read-only but timed out and was shut
  down. Codex did not block indefinitely; no senior-review result was claimed.

### Changes made

Closed now:

- **CR-H1:** web validator now rejects overlay brand IDs that already exist in
  bundled `data/printers.json`, matching the existing bundled-printer rejection.
- **Runtime additive-only defense:** iOS validation now rejects remote brand IDs
  and remote printer IDs that collide with bundled IDs before merge.
- **Jason QA delta:** Node validator now enforces the same
  `2_099_123_199` `content_version` ceiling as Swift.
- **CR-M1:** `prepareForLaunch()` now carries an explicit doc comment warning
  that it mutates the current snapshot and must not be used from launch after
  engine initialization.
- **CR-M3 / CR-M4:** Swift and spec now document the `YYYYMMDDXX` ceiling,
  capped at `2099-12-31-99`.
- **CR-M5:** spec now documents the promotion-from-overlay-to-bundled workflow.
- **Spec drift:** spec Data Flow now matches the actual next-launch-only remote
  fetch behavior.
- **CR-L1:** ROADMAP / NEXT-SESSION now record the `High-speed` rationale.
- **CR-L5:** commit plan is now three commits: web fix, iOS fix, review docs.
- **Release state:** ROADMAP and NEXT-SESSION now mark `202605101130` as stale /
  superseded and require a replacement TestFlight before phone QA and App
  Review.

Deferred / not changed:

- **CR-M2 telemetry:** no `os_log` or telemetry was added for cache rejection.
  This remains useful, but non-blocking for this corrective pass.
- **CR-M6 validator path coupling:** still local-layout-coupled to the sibling
  iOS repo. Leave as follow-up unless this validator is added to web CI.
- **CR-L4 invalid-envelope ergonomics:** no extra comment/error split added.
  Behavior remains fail-closed.

### Verification evidence

Local checks run after the corrective patch:

- `node scripts/validate-ios-printer-overlay.js` passed:
  `ok: 0 brands, 0 printers`.
- Validator negative checks passed in a temp sandbox:
  bundled brand collision, bundled printer collision, malformed
  `min_app_version`, future `min_app_version`, bad `payload_sha256`, and
  over-ceiling `content_version`.
- `node scripts/validate-data.js` passed all data files.
- Targeted iOS catalog tests passed:
  `xcodebuild test ... -only-testing:3DPrintAssistantTests/PrinterCatalogProviderTests`
  → 25 tests, 0 failures.
- Full iOS unit target passed:
  `xcodebuild test ... -only-testing:3DPrintAssistantTests`
  → 93 tests, 0 failures.
- `git diff --check` passed in both web and iOS repos.

Post-push gates not run yet:

- No commit was created.
- No push or Cloudflare deploy was performed.
- Live production overlay bytes/hash were not verified.
- No replacement TestFlight was dispatched.
- No phone QA was run on a replacement build.

### Current commit split

Recommended commits remain:

- Web: `fix: harden iOS printer overlay validator`
  - overlay JSON
  - overlay validator
  - remote catalog spec
  - ROADMAP / NEXT-SESSION release-state updates
- iOS: `fix: reject bundled remote catalog collisions`
  - app launch snapshot work from prior corrective pass
  - provider validation hardening
  - provider tests
- Docs: `docs: update Claude review with Codex corrective pass`
  - this review file only

### Codex self-check

Found:

- Claude's brand-collision finding was valid, and the same class of bug also
  needed Swift runtime defense.
- The spec still described current-launch remote merge after the code had moved
  to next-launch-only cache refresh.
- ROADMAP / NEXT-SESSION still treated `202605101130` too much like the next
  candidate instead of a superseded build.

Changed:

- Closed the deploy/runtime bundled-ID collision gap.
- Aligned Node and Swift `content_version` ceilings.
- Updated spec, ROADMAP, NEXT-SESSION, and this review file with the corrected
  release posture.

Skipped:

- Senior-review result was not used because the agent timed out.
- Telemetry and CI-layout polish were deferred as non-blocking.
- No commit, push, deploy, TestFlight, live overlay verification, or phone QA
  was performed in this pass.

---

## Claude verdict on Codex pass-3 response (2026-05-10, third pass)

**Stance:** same gated framework as passes 1 and 2 — verify every claim,
code-review the changes, run an independent code-reviewer subagent, classify
remaining findings into the buckets Codex requested. **Expanded scope this pass:**
full-file reads of every file Codex has touched, not just diffs.

### One-line recommendation

**Pass-3 closes the prior blockers strongly. One remaining HIGH found by the
independent reviewer (H-A — a self-contradiction in the new spec section)
should be patched before the web commit lands. Everything else is
safe-follow-up. Ship sequence: fix H-A → 3 commits → push → deploy →
verify live overlay → replacement TestFlight → phone QA → App Review.**

### Codex's 6 verification asks — answered

| # | Ask | Verdict | Evidence |
|---|---|---|---|
| 1 | Additive-only contract enforced consistently (validator + runtime + spec + tests) | ✓ | Web validator `bundledBrandIds.has(id)` line 174 + `bundledPrinterIds.has(id)` line 184; iOS provider `bundledBrandIds.isDisjoint(with:)` line 215 + `bundledPrinterIds.isDisjoint(with:)` line 222; spec line 57 + line 67; 2 new tests `testOverlayBrandMatchingBundledBrandIsRejected` + `testOverlayPrinterMatchingBundledPrinterIsRejected`. Two-layer defense. |
| 2 | Next-launch-only refresh accurately represented (launch + provider + spec + tests) | ✓ | `Task(.utility)` fires after `engineReady = true` (`PrintAssistantApp.swift:44–46`); `refreshRemoteCacheForNextLaunch()` only writes cache; spec lines 22–29 match; `testRefreshRemoteCacheForNextLaunchDoesNotMutateCurrentCatalog` exercises both halves. Minor wording drift: spec step 6 uses sequential language for what's actually a fire-and-forget detached task (M-E below). |
| 3 | `content_version` ceiling aligned (Node + Swift + spec) | ✓ | All three say `2_099_123_199`. Validator now enforces the ceiling on web side too (was Swift-only in pass 2). |
| 4 | Release docs prevent submitting stale build `202605101130` | ✓ | Build is named-and-blocked in 6+ places across ROADMAP and NEXT-SESSION. Wordsmith note: *"superseded"* implies a replacement exists; none does yet. *"Blocked-pending-replacement"* would be more accurate. Not blocking. |
| 5 | Three-commit split clean | ✓ | Web (overlay+validator+spec+ROADMAP+NEXT-SESSION), iOS (app+provider+tests), docs (review file). Web bundle is borderline — ROADMAP+NEXT-SESSION could be split into a separate `docs:` commit for cleanliness, but acceptable as one hardening pass. |
| 6 | Bucket-classify remaining findings | ✓ | See full table below. |

### Closure verdict on prior findings

| Finding | Status | Source |
|---|---|---|
| CR-H1 (validator brand-collision check) | ✓ closed + bonus iOS-runtime enforcement | pass-2 |
| CR-M1 (`prepareForLaunch()` posture) | ✓ closed via doc-comment | pass-2 |
| CR-M3 (magic-number comment) | ✓ closed both sides | pass-2 |
| CR-M4 (rollback ceiling) | ✓ closed | pass-2 |
| CR-M5 (promotion workflow) | ✓ closed (with spec contradiction H-A introduced — see below) | pass-2 |
| CR-L1 (High-speed rationale) | ✓ closed in ROADMAP + NEXT-SESSION | pass-2 |
| CR-L5 (commit split) | ✓ closed | pass-2 |
| CR-M2 (cache telemetry) | ⚠ deferred-honest | pass-2 |
| CR-M6 (validator path coupling) | ⚠ deferred-honest | pass-2 |
| CR-L3 (test rigor) | ⚠ deferred-honest | pass-2 |
| CR-L4 (invalid-envelope error masquerade) | ⚠ open — agent argues elevation to MEDIUM (M-D below) | pass-2 |

**Closure rate: 7 of 11 closed, 4 honestly deferred. Strong.**

### New findings (pass 3)

#### HIGH

**H-A — Spec self-contradiction in the new "Promotion From Overlay To Bundled" section.**
**File:** [`docs/specs/ios-remote-printer-catalog.md:93`](../specs/ios-remote-printer-catalog.md#L93).
**Evidence:** the section's numbered steps say (1) bundle the row in the next iOS binary, then (2) remove the overlay row + bump version. The parenthetical at line 93 says *"Removing the overlay row before the bundled row ships is safe: older apps keep the last valid cache or bundled catalog."* This contradicts the numbered ordering AND the actual cache-replacement behavior: an older app on a binary that does NOT yet have the bundled row will fetch the new (smaller) overlay, validate it (passes — no collision because their bundled doesn't have the row yet either), write it as last-known-good cache, and on next launch lose the printer they previously had via the older overlay.
**Why it matters:** owner-or-future-Codex following the parenthetical guidance will silently break the printer for users on the in-flight older binary. The contradiction is exactly the class of doc bug that ships a regression because someone trusted the wrong sentence.
**Recommended fix:** rewrite the parenthetical. Suggested wording:
> *Order matters. Step 1 must ship to all users on auto-update before step 2 lands. If you remove the overlay row first, devices still on the older bundled binary will fetch the new (smaller) overlay, write it to cache, and lose the printer on next launch. Practical rule: don't bump the overlay until the bundled binary has been live in App Store for at least one auto-update cycle (~24h).*
**Severity:** HIGH (silent UX regression for in-flight users; spec is currently misleading about the safe ordering). **Pre-commit blocker** because the spec lands in the web commit.

#### MEDIUM (all deferred to safe-follow-up bucket)

| ID | Finding | File:line |
|---|---|---|
| M-A | `parseVersion` overflow asymmetry web vs iOS — JS `Number(part)` accepts arbitrary digit strings (silent precision loss); Swift `Int(part)` rejects > `Int.max`. Pathological version like `"1.0.99999999999999999999"` web-validates but iOS-rejects. | `validate-ios-printer-overlay.js:60` ↔ `PrinterCatalogProvider.swift:388` |
| M-B | `fetchValidatedRemoteOverlay` accepts equal `content_version` and overwrites. Strict `>` means cached == remote → proceed to overwrite cache without hash short-circuit. Re-deploy at same version with mutated payload silently replaces local cache. | `PrinterCatalogProvider.swift:106` |
| M-C | Detached `Task(priority: .utility)` in launch path is unstructured. If user retries engine init mid-fetch (`retryCount` increments), a second refresh task spawns while the first is in-flight; `.atomic` write doesn't serialize, last-writer-wins is non-deterministic. | `PrintAssistantApp.swift:44–46` |
| M-D | (Promoted from CR-L4 by agent.) `compareVersions` returning nil for malformed `currentAppVersion` throws `invalidEnvelope`. A developer accidentally shipping a malformed `MARKETING_VERSION` rejects EVERY overlay forever with no telemetry surface (CR-M2). Misclassified silent-failure vector. Defense-in-depth chain partially mitigates: Swift `parseVersion` strict regex would catch obvious malformations at compile-time. | `PrinterCatalogProvider.swift:160–162` |
| M-E | Spec Data Flow step 6 uses sequential language ("Swift tries to fetch ... after engine initialization") for what's actually a fire-and-forget detached task. Mild contract drift between spec and code. | `docs/specs/ios-remote-printer-catalog.md:26` |
| CR1-M1 | Material warning suppression (`/open-frame printers/i.test(msg)`) is a string-match on translatable display text. Today benign (only ABS + PC have the phrase) but fragile if i18n added or wording drifts. | `engine.js:1390` |
| CR1-M4 | Advanced bed-temp clamp at engine.js:1206-1207 unconditionally calls `Math.min(initBed, bedCap)`. If a future material lacks `bed_temp_max`, `bedCap = NaN` propagates silently into Bambu export (`parseInt("NaN °C")` → empty string). Latent only — all 19 materials currently define the field. | `engine.js:1206–1207` |
| CR3-M1 | Audit `DEFAULT_STATE` uses key `level` (line 61); engine reads `state.userLevel` (engine.js:1477, 1814). Beginner-warning + `isBeginnerMode` paths never exercised by the 46,512-config sweep. | `scripts/profile-matrix-audit.js:61` |
| CR3-M2 | Test isolation gap. `EngineServiceTests:10`, `OutputViewModelTests:13`, `OutputViewIntegrationTests:15` call `EngineService.shared.initialize()` without override; sandbox cache state leaks between simulator runs. **Mitigated by H1 additive-only fix** (cache can only ADD, not REPLACE), but count-based assertions remain brittle. | iOS test files |

#### LOW (all safe-follow-up)

| ID | Finding | File:line |
|---|---|---|
| L-A | Cache validation does heavy `JSONDecoder().decode(PrintersData.self, ...)` round-trip on every call. Cheap on small data, redundant work in hot loops if future code adds them. | `PrinterCatalogProvider.swift:176` |
| L-B | `currentPrintersData` and `currentSource` read under separate `withLock` calls. Consumers reading both can observe new-data + old-source-tag. Only matters for instrumentation; no catalog correctness impact. | `PrinterCatalogProvider.swift:40–50` |
| L-C | `readIOSMarketingVersion` regex matches first occurrence in `project.yml`. Fine today (one target). Latent if project ever splits per-config (Debug vs Release) MARKETING_VERSION values. | `validate-ios-printer-overlay.js:81` |
| L-D | Test `testRefreshRemoteCacheForNextLaunchDoesNotMutateCurrentCatalog` asserts `nextLaunchProvider.currentSource == "remote-2"` but the assertion proves "next launch picks up cached overlay" via a different code path (`applyCachedOverlayIfValid` in init, not `prepareForLaunch`). Test name vs assertion mechanism mismatch. Worth a doc-comment for the next reader. | `PrinterCatalogProviderTests.swift:421–424` |
| L-E | `applyCachedOverlayIfValid()` runs synchronously on main actor in `.task` modifier. With currently-empty cache: trivial. With a large future cache + slow device: measurable cold-start latency contribution. | `PrinterCatalogProvider.swift:67` |
| CR1-L1 | `BAMBU_PROCESS_INHERITS` covers 9 of 12 Bambu printers. `x2d` and `h2d_pro` are explicit `null` placeholders ("shares with X1C until verified"). `h2c`, `h2d`, `h2s` are *implicitly* missing — fall through to X1C profiles via `\|\| BAMBU_PROCESS_INHERITS.x1c` at line 2504, with no comment marking them as known-incomplete. Bambu Studio export emits wrong process inheritance string for 5 printers. Export UI disabled today; no live blast radius. | `engine.js:2428–2438` |
| CR3-L1 | Runbook `profile-data-change-test-protocol.md` doesn't include `validate-ios-printer-overlay.js`. Future overlay edits have no documented gate. | `docs/runbooks/profile-data-change-test-protocol.md` |

#### OBSERVATION

| ID | Finding |
|---|---|
| O-A | `min_app_version` operational constraint: you can never raise `min_app_version` ahead of an iOS binary release. Worth a one-liner in the spec's Promotion section. |
| CR1-L6 / O-D | `expires_at` is in the spec envelope example (line 42) but neither validator nor provider parses it. Reserved-not-implemented. Either remove from spec example or add a "reserved, not yet validated" note. |
| CR3-O2 | `H2D Pro` lands at end of H2 Series picker group (after `H2S`) because it's last in `printers.json`. UI ordering is data-order, not alphabetical within group. Pure UX nicety. |
| CR3-O3 | `buildPrinterDescForAudit` (audit script line 622) duplicates `buildModelDesc` (engine.js:1016) with a subtle drift — audit defaults to `"Open"` for any non-`active_heated`/`passive` enclosure; engine returns nothing. No printer triggers this today. Recommend audit imports `Engine.buildModelDesc` directly. |
| CR3-O4 | Runbook example evidence cites `iOS tests: 85/85`; current count is 93. Same hand-maintained-count anti-pattern as O7. |
| O7 (pass 1) | Test-count drift in `3dpa-context.md:137` and `3dprintassistant-ios/CLAUDE.md:24` (both say 64). Current count is 93. Will keep drifting until replaced with `see CI` or a generated number. |
| O8 (pass 1) | Aging follow-ups in active queue: `[CRITICAL-001-followup]` open 17 days, `[LOW-011]` open 13 days. ROADMAP active queue is becoming a parking lot. |

### Bucket classification (Codex's ask #6)

| Bucket | Findings | Count |
|---|---|---|
| **pre-commit blocker** | H-A | 1 |
| **pre-push blocker** | (none beyond H-A) | 0 |
| **pre-TestFlight blocker** | (none — all engineering blockers H1/M2/H4/H5 closed) | 0 |
| **pre-App-Review blocker** | (none — phone QA on replacement build is the gate) | 0 |
| **safe-follow-up** | M-A, M-B, M-C, M-D, M-E, CR-M2, CR-M6, CR1-M1, CR1-M4, CR3-M1, CR3-M2, CR-L3, L-A, L-B, L-C, L-D, L-E, CR1-L1, CR3-L1, plus all OBSERVATIONs | 26 |

**TL;DR:** one pre-commit fix, then ship.

### Recommendation + ship sequence

1. **Patch H-A (the only pre-commit blocker).** ~10 minutes — rewrite the parenthetical at `docs/specs/ios-remote-printer-catalog.md:93`. Re-stage the spec file in the web commit.

2. **Land the three commits** Codex proposed:
   - Web: `fix: harden iOS printer overlay validator` (overlay JSON + validator + spec + ROADMAP + NEXT-SESSION).
   - iOS: `fix: reject bundled remote catalog collisions` (app launch + provider + tests).
   - Docs: `docs: update Claude review with Codex corrective pass` (this review file).

3. **Push web first** (auto-deploys via Cloudflare Pages). Verify the live overlay returns the empty payload + correct hash via `curl https://3dprintassistant.com/catalog/ios-printer-overlay-v1.json | sha256sum`.

4. **Push iOS, dispatch replacement TestFlight** (same-version 1.0.3, new build number).

5. **Phone-test the locked 5 cases from `NEXT-SESSION.md`** PLUS one cold-start cellular test (validates H4 fix from the user side).

6. **Submit App Review** only after phone QA passes. The catalog feature App Review note per spec must ship with the submission.

7. **Schedule a `chore:` follow-up commit** for the 26 safe-follow-up items. Don't try to bundle them — pick the ones that actually matter to you (CR-M2 telemetry is probably the highest-value; CR3-M1 audit `level` typo is the cheapest), defer the rest indefinitely. Hobby project budget; not all flagged items need closure.

### Self-check

Per the gate plan I committed to before starting:

| Gate | Status | What it produced |
|---|---|---|
| 0 — Scope lock | ✓ | 9 modified files identified across both repos; matches Codex's claim. |
| 1 — Closure check on prior findings | ✓ | 7 of 11 closed; 4 deferred-honest. |
| 2 — Code review of pass-3 deltas | ✓ | Identified `PrinterCatalogError.duplicateIds` overload + test type-assertion gap; both filed as low-priority observations elsewhere. |
| 3 — Codex's 6 verification asks | ✓ | All 6 answered with line-level evidence. |
| 4 — engine.js full pass | ✓ | New: CR3-O1 (BAMBU inheritance gap extends to 5 printers); reconfirmed CR1-M1, CR1-M4, CR1-L1 still open. |
| 5 — Web scripts full pass | ✓ | New: CR3-M1 (audit `level` vs `userLevel`), CR3-O3 (`buildPrinterDescForAudit` duplicates `buildModelDesc`). |
| 6 — Data files structural sanity | ✓ | Clean. 68 printers, 12 brands, 19 materials, 9 nozzles. All required clamp fields present. |
| 7 — iOS layer full pass | ✓ | New: CR3-M2 (test isolation gap). |
| 8 — Docs pass | ✓ | New: CR3-L1 (runbook missing overlay step), CR3-O4 (runbook stale evidence). |
| 9 — Independent code-reviewer subagent | ✓ | Subagent caught **H-A (HIGH) + 5 MEDIUM (M-A through M-E) + 5 LOW (L-A through L-E) + 2 OBSERVATION** I had not surfaced. |
| 10 — Bucket classification + verdict | ✓ | This section. |

**Where I'm consistently weak across all three passes:**

- **Cross-platform parity edge cases.** I read Swift and Node validators in separate passes and rarely cross-reference systematically. The agent caught CR-H1 in pass 2 (validator brand-side missing) and M-A in pass 3 (parseVersion overflow asymmetry). Pattern: when two implementations are supposed to be identical, I don't run the equivalent of a property-based test in my head.
- **Concurrency / unstructured-task analysis.** Agent caught H4 (pass 2) and M-C (pass 3). I read concurrency code as "looks fine" without modeling the retry/cancellation paths.
- **Spec internal consistency under edits.** Agent caught H-A — I read the new "Promotion" section in pass 2 and approved the prose without noticing the parenthetical contradicts the numbered steps. Pattern: I read sections in isolation, not as a coherent document.

**Where I'm consistently strong:**
- Codebase-wide standing-rules sweeps.
- Data-shape integrity checks.
- Closure verdicts on specific prior findings.
- Project-status / process-hygiene observations (test-count drift, missing session logs, aging follow-ups).
- Catching subtle data-key drift (CR3-M1 — `level` vs `userLevel`).

**Confidence on this pass:** medium-high. Same caveats as prior passes — performance / memory / cross-device behavior under restore can't be assessed from static review.

**Pattern across all three passes:** independent reviewer catches 3–5 substantive items I miss every single time. That's a meaningful signal — the subagent is genuinely value-additive, not a check-box. Worth running on every comparable review going forward.

**Reviewer:** Claude (cold pass, 2026-05-10, third iteration).

---

## Codex execution update (2026-05-10, v1.0.3 corrective pass)

### Verdict

Codex executed the agreed corrective release plan through replacement TestFlight
dispatch. Current status is **GREEN through TestFlight upload**, with App Review
still blocked on owner phone QA and final App Store Connect submission checks.

Build `202605101130` remains blocked and must not be submitted. Replacement
TestFlight build `202605101544` was uploaded successfully from iOS commit
`bddbc91`.

### H-A patch

Patched `docs/specs/ios-remote-printer-catalog.md` to remove the unsafe claim
that deleting an overlay row before bundled rollout is generally safe.

The spec now says order matters: a real printer or brand promotion must ship in
the bundled binary before the overlay row is removed, otherwise older binaries
can fetch/cache the smaller overlay and lose that printer on next launch. It also
records the current empty-overlay deployment as a narrow exception because build
`202605101130` is superseded/TestFlight-only and must not be the release
candidate.

### Final reviewer gate

Senior reviewer: **GREEN**, no v1.0.3 release blockers.

QA reviewer: **GREEN**, no blockers before commit, web push, live overlay
verification, iOS push, or replacement TestFlight dispatch.

Remaining QA is manual phone QA on the exact replacement TestFlight build.

### Commands and results

Local gates run before commit:

```bash
node scripts/validate-ios-printer-overlay.js
# [ios-printer-overlay] ok: 0 brands, 0 printers

node scripts/validate-data.js
# all data files valid

node scripts/walkthrough-harness.js
# passed; only known 17 soft max_mvs warnings

node scripts/profile-matrix-audit.js
# 55/55 curated scenarios, 46,512 broad invariant configs, 0 failures

git diff --check
# passed in web repo

git diff --check
# passed in iOS repo

xcodebuild test -scheme 3DPrintAssistant \
  -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.3.1' \
  -only-testing:3DPrintAssistantTests/PrinterCatalogProviderTests
# passed: 25/25 tests

xcodebuild test -scheme 3DPrintAssistant \
  -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.3.1' \
  -only-testing:3DPrintAssistantTests
# passed: 93/93 tests
```

Live overlay verification after web push:

```text
HTTP 200
content_version: 2026051004
enabled: true
min_app_version: "1.0.3"
payload.brands: []
payload.printers: []
payload_sha256: 8215559455fffda32cfcba51264fa2afe88bae61ff7969a8e7dda082117bbd2d
computed canonical payload hash: 8215559455fffda32cfcba51264fa2afe88bae61ff7969a8e7dda082117bbd2d
no x2d / h2d_pro overlay rows
```

TestFlight dispatch:

```text
Workflow: Deploy to TestFlight
Run: https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25632892903
iOS commit: bddbc9144a832591f84f00e9e1a3bc54fb20e075
Build number: 202605101544
Result: success
Upload: Successfully uploaded package to App Store Connect
Note: fastlane used skip_waiting_for_build_processing, so App Store Connect
processing may continue briefly after upload success.
```

### Commits and pushes

Web repo:

```text
c153a42 fix: harden iOS printer overlay validator
pushed to origin/main
```

iOS repo:

```text
bddbc91 fix: reject bundled remote catalog collisions
pushed to origin/main
```

Review docs repo commit:

```text
this commit: docs: update Claude review with Codex corrective pass
```

### Skipped or still gated

- Phone QA was not performed by Codex; it must be run manually on TestFlight
  build `202605101544`.
- App Review was not submitted.
- App Store submission notes still need the final pre-App-Review update before
  submission: point at replacement build `202605101544`, include the
  remote-catalog data-only review note, and keep Manual Release / correct build
  selection as explicit ASC gates.
- Safe-follow-up findings from Claude's third pass remain deferred unless one is
  upgraded by a future reviewer.

### Required next phone QA

Run these on replacement TestFlight build `202605101544` only:

- normal cold launch
- force-quit airplane-mode cold launch
- weak/cellular launch if practical
- X1E + PC chamber copy
- P2S + PC bed clamp
- A1 Mini + HIPS bed clamp
- Ender-3 V3 + PETG Fast nozzle cap
- Bambu H2D/H2D Pro/X2D picker rows show `High-speed`
- Kobra X, Centauri Carbon, and PLA Metal still visible
- TestFlight review prompt remains suppressed
- empty overlay/cache state does not remove bundled printers
- update over stale TestFlight build once, without deleting the app, if available
