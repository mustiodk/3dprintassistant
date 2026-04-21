# HIGH findings

14 findings at this severity. HIGH-001 through HIGH-011 from the initial review. HIGH-012, HIGH-013, HIGH-014 added 2026-04-20 from the Phase 1 domain walkthrough.

---

### [HIGH-001] `exportBambuStudioJSON` emits UNSCALED retraction — silently undoes IMPL-039 M4 on export

**Platform:** both (bug lives in `engine.js`, visible on both platforms)
**Files:** `engine.js:894`, `engine.js:1761-1775`, `engine.js:2223`
**Commit:** c4c5071 (web)

**Summary**
`resolveProfile` calls `_scaleRetraction(mbs.retraction_distance)` and shows the nozzle-scaled retraction in the user-visible profile (`p.retraction_distance`). But `getAdvancedFilamentSettings` returns the raw unscaled `retraction_length` from `base_settings`, and `exportBambuStudioJSON` reads **that** path at line 2223 (`filament.filament_retraction_length = [String(bs.retraction_length)]`). So the Bambu filament preset the user imports has the unscaled value.

Worse, the two fields `retraction_distance` (resolveProfile output) and `retraction_length` (base_settings input) refer to the same physical concept but are used inconsistently across call sites — they should be collapsed.

**Evidence**
```js
// engine.js:1762 — resolveProfile, SCALED (what UI shows)
const rd = _scaleRetraction(mbs.retraction_distance);
p.retraction_distance = S(`${rd} mm`, ...);

// engine.js:894 — getAdvancedFilamentSettings, UNSCALED
retraction_length: `${bs.retraction_length} mm`,

// engine.js:2223 — exportBambuStudioJSON, UNSCALED
if (bs.retraction_length != null) filament.filament_retraction_length = [String(bs.retraction_length)];
```

**Impact**
On 0.8mm nozzles the exported retraction is ~30-40% too small; on 0.2mm it's ~40% too large. Users on default 0.4 don't notice. This is exactly the class of silent drift IMPL-039 set out to eliminate — the UI shows one number, the slicer gets a different one, and the user has no warning. "Corrupt export" per the severity rubric, though the file still imports cleanly.

**Recommendation**
In `exportBambuStudioJSON`, read the scaled retraction from the resolved profile (or call `_scaleRetraction` on the way out) for both `filament_retraction_length` and `filament_retraction_speed`. Then collapse `retraction_length` and `retraction_distance` to a single canonical name in the engine + materials.json.

**Effort estimate:** small (< 1 day)

---

### [HIGH-002] IMPL-040 chip-desc parity tests pass with almost-total coverage regression

**Platform:** iOS
**Files:** `3DPrintAssistantTests/EngineServiceTests.swift:195-257`
**Commit:** 24aef66 (iOS)

**Summary**
The surface-preset parity test iterates 7 printer×nozzle combos × 6 surfaces = 42 potential checks (brief says "45"; actual is 42 — off-by-3 inconsistency with docs). Inside the loop, three branches `continue` without any failure signal: missing `chip`, missing `chip.desc`, and the regex miss. The only hard coverage floor is `XCTAssertGreaterThan(checked, 0)`. A regression where `engine.js` stops emitting `desc` on 41 of 42 chips would still pass this guard because the surviving one satisfies `checked > 0`.

**Evidence**
```swift
// EngineServiceTests.swift ~205-232
guard let chip = surfaceGroup.items.first(where: { $0.id == surfaceId }) else { continue }
guard let desc = chip.desc else { continue }          // silent skip
let match = descRegex.firstMatch(in: desc, ...)       // silent skip possible
if let m = match { /* assert */ checked += 1 }
// ...
XCTAssertGreaterThan(checked, 0, "IMPL-040 guard should have checked at least one combo")
```

**Impact**
The test claims to enforce "chip desc number equals emission number for every combo." What it actually enforces is "at least one combo works." Any regression that degrades 41/42 is invisible; CI still green.

**Recommendation**
1. Compute `expectedCount` (7 × 6 = 42) at test time.
2. Replace silent `continue`s with `XCTFail(...)`.
3. Assert `XCTAssertEqual(checked, expectedCount)` at the end.
4. As a second tier, add hardcoded expected clamped values for 5-10 combos — the current test only asserts chip-emission **agreement**, not that either number is **correct** (so IMPL-039's silent-clamp-drop regression wouldn't be caught either).

**Effort estimate:** trivial

---

### [HIGH-003] Actor isolation does NOT pin JSContext to a single thread — JSCore thread-affinity hazard

**Platform:** iOS
**Files:** `3DPrintAssistant/Engine/EngineService.swift:82-464`
**Commit:** 24aef66

**Summary**
`EngineService` is declared `actor`, which guarantees serialised access but **not** a single underlying thread — Swift concurrency can migrate actor execution between threads on the cooperative pool between suspension points. JavaScriptCore documents that a `JSContext` must be used from a single thread, or locked via its `JSVirtualMachine`. `initialize()` contains `await Task.sleep` inside its poll loop (line 171), which guarantees at least one thread hop before the context is stored at line 177. Subsequent `evaluate()` calls may land on a different thread than the one that created the context.

**Evidence**
```swift
// EngineService.swift:163-177
while attempts < 50 {
    try await Task.sleep(nanoseconds: 10_000_000)   // <— thread hop allowed here
    attempts += 1
}
// Thread that resumes us is not guaranteed to be the one that ran init().
self.context = ctx
```

**Impact**
Intermittent silent JSValue corruption or crashes under memory pressure — JSValues allocated on thread A being GC'd on thread B. Has not visibly manifested because call volume is low, but this is the #1 documented JSCore bug and a ticking timebomb at scale or under iOS-18+ scheduler changes.

**Recommendation**
Replace `actor` isolation with an explicit dedicated serial executor. Two reasonable shapes:

**(a)** A class backed by a dedicated `DispatchQueue(label: "engine.js", qos: .userInitiated)` and every public method wraps work in `withCheckedThrowingContinuation { q.async { ... } }`. Drops `actor` but gains documented single-thread affinity.

**(b)** Keep `actor` but explicitly lock via `context.virtualMachine.addManagedReference` + `JSVirtualMachine` locks, making the affinity requirement explicit even if the actual thread changes.

(a) is simpler and what Apple's own JS bridging samples use.

**Effort estimate:** small (< 1 day)

---

### [HIGH-004] `_engineError` read happens BEFORE the final sleep — real JS errors reported as "timed out"

**Platform:** iOS
**Files:** `3DPrintAssistant/Engine/EngineService.swift:151-178`
**Commit:** 24aef66

**Summary**
The poll loop reads `_engineError` and `_engineReady` at the top of each iteration, then sleeps. If an error is posted during the final sleep, it's never observed. The post-loop `guard` only rechecks `_engineReady`, not `_engineError`. A `ready=false && error=set` combination is misreported to the user (and Sentry) as `"Engine.init() timed out"` instead of the real TypeError/ReferenceError/fetch failure.

**Evidence**
```swift
while attempts < 50 { ...
    let error = ctx.evaluateScript("_engineError")?.toString()
    if let error, error != "null", !error.isEmpty { throw EngineError.initFailed(error) }
    if ready { break }
    try await Task.sleep(nanoseconds: 10_000_000)
    attempts += 1
}
guard ctx.evaluateScript("_engineReady")?.toBool() == true else {
    throw EngineError.initFailed("Engine.init() timed out")   // swallows real error
}
```

**Impact**
Sentry reports the wrong root cause for every init failure that resolves its error state after the last polled iteration. Owner debugging engine-init crashes sees a misleading timeout instead of the real stack/message.

**Recommendation**
Re-read `_engineError` first in the post-loop block; if set, throw `initFailed(error)` before the timeout case. Also consider extending the max poll window — 500ms is tight for cold-start on older iPhones.

**Effort estimate:** trivial

---

### [HIGH-005] `_engineError != "null"` string-compare misses `Promise.reject(null)` cases

**Platform:** iOS
**Files:** `3DPrintAssistant/Engine/EngineService.swift:167-170`
**Commit:** 24aef66

**Summary**
`_engineError` is initialised to `null` in JS (line 157 polyfill), and Swift-side compares the string form: `error != "null"`. If any engine.js code path ever does `reject(null)` or assigns `_engineError = null` intentionally, `String(null) === "null"` and the guard silently ignores it.

**Evidence**
```swift
if let error, error != "null", !error.isEmpty { throw EngineError.initFailed(error) }
```

**Impact**
Low probability today (engine.js doesn't reject with null), but a nasty failure mode if it ever starts. The "empty-string" check also means any legit error message starting with an empty coerce (none currently) is ignored.

**Recommendation**
Replace the sentinel with `typeof _engineError !== 'undefined'` or a structured `{ set: false, value: null }` object set on catch. Then on Swift side check the boolean flag, not the string.

**Effort estimate:** trivial

---

### [HIGH-006] iOS `SlicerLayout.swift` hardcodes `SLICER_TABS` + `SLICER_PARAM_LABELS` — silent drift from engine

**Platform:** iOS
**Files:** `3DPrintAssistant/Models/SlicerLayout.swift:22-297`
**Commit:** 24aef66

**Summary**
`SlicerLayout.swift` is a Swift mirror of the engine's `SLICER_TABS` (engine.js:351) and `SLICER_PARAM_LABELS` (engine.js:495) for all three slicers. The file even self-documents the risk ("Descriptions synced from engine.js SLICER_TABS — update if engine changes"). Every time engine adds/renames/reorders a param or tab, iOS silently diverges until a human catches it.

**Impact**
Structural knowledge about "what tabs exist per slicer" and "what each param is called per slicer" lives in two places. Web users see the correct tab structure instantly; iOS users see whatever was true at the last manual port.

**Recommendation**
Expose the engine's `SLICER_TABS` and `SLICER_PARAM_LABELS` via the JSCore bridge. Add `EngineService.getSlicerTabs(for: String) -> [SlicerTab]` and `getParamLabels(for: String) -> [String: String]` that read from JS. Delete the Swift copies. Add an XCTest that diffs the bridged output against a stored snapshot to catch future engine edits.

**Effort estimate:** small (< 1 day)

---

### [HIGH-007] iOS `OutputView.nozzleSizeKey` parses nozzle ID by string split — encodes a naming convention

**Platform:** iOS
**Files:** `3DPrintAssistant/Views/Output/OutputView.swift:29-31`
**Commit:** 24aef66

**Summary**
`nozzleSizeKey` computes the size bucket for the Speed Limit tab by splitting the nozzle ID on underscore and taking the last segment. This bakes the assumption "nozzle IDs always end with the size, underscore-delimited" into the view layer. The engine already exposes `getNozzle(id).size` as a typed numeric field (`engine.js:655`). A future nozzle with ID `std_hardened_0.4` or `precision-v2` silently drops the user into nil-data territory.

**Evidence**
```swift
private var nozzleSizeKey: String {
    appState.nozzle.split(separator: "_").last.map(String.init) ?? "0.4"
}
```

**Recommendation**
Add `EngineService.getNozzleSize(_ id: String) -> String?` that returns `String(getNozzle(id).size)`, and use it as the key. Delete the split.

**Effort estimate:** trivial

---

### [HIGH-008] `mapForSlicer` silently returns `validSet[0]` fallback without warning — unseen value substitution on top/bottom/internal/seam patterns

**Platform:** both (engine)
**Files:** `engine.js:731-732`, C6 warning loop at `engine.js:1311-1327`
**Commit:** c4c5071

**Summary**
When a pattern value has no entry in the per-slicer `fallbacks` map and the target slicer rejects the value, `mapForSlicer` returns `validSet[0]` silently. The C6 warnings loop only catches this for `sparse_infill_pattern` and `support_interface_pattern` — the other four `patternFor` fields (`top_surface_pattern`, `bottom_surface_pattern`, `internal_solid_infill_pattern`, `seam_position`) substitute without any user-visible trace.

**Impact**
Prusa/Orca users silently get different patterns than shown in the objective-profile chip text. If the `fallbacks` map gets stale or a typo lands, the `[0]` fallback hides the regression completely.

**Recommendation**
Either (a) extend the C6 warning loop to cover every field `patternFor` handles, OR (b) have `mapForSlicer` write to a side-channel list of substitutions that `getWarnings` reads. Simpler: drive C6 from a module-level list of "fields routed through patternFor" so adding a new one auto-gains a warning.

**Effort estimate:** small (< 1 day)

---

### [HIGH-009] `_clampNum` returns `value` unchanged for non-finite input — `undefined.toFixed()` crashes downstream

**Platform:** both (engine)
**Files:** `engine.js:693-699`, call sites at `engine.js:234`, 243, 1380+
**Commit:** c4c5071

**Summary**
`_clampNum(value, min, max)` returns `value` as-is if `parseFloat(value)` is non-finite. For `value = undefined`, `null`, or a string like `"—"`, the unchanged value propagates into template-literal emission (`${lh}` becomes `"undefined"` / `"null"`) and `.toFixed(2)` call sites in chip desc builders crash with TypeError.

**Evidence**
```js
function _clampNum(value, min, max) {
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (!isFinite(n)) return value;   // returns undefined/null/"—" unchanged
  ...
}
// call site (engine.js:243 surfaceDesc):
const lhFmt = lh.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
```

**Impact**
A single malformed surface preset in `objective_profiles.json` (missing `layer_height`) crashes `getFilters()` → blank UI on web, empty filter list on iOS. No graceful degradation.

**Recommendation**
Either make `_clampNum` always return a finite number (fall back to clamped `min` or caller-supplied default), OR guard each call site with `typeof x === 'number'` before formatting. The first is less error-prone.

**Effort estimate:** trivial

---

### [HIGH-010] Web `/api/feedback` has no rate limiting — Discord-relay abuse trivial

**Platform:** infra / web
**Files:** `functions/api/feedback.js:85-191`
**Commit:** c4c5071

**Summary**
The Worker validates origin, honeypot, payload shape, and caps size — but there's no per-IP or global rate limit. `Origin` is trivially spoofed server-to-server (`curl -H "Origin: https://3dprintassistant.com" ...`), so the origin check only stops browser-initiated attacks. A bot can saturate the per-webhook 30 req/min rate limit and silence real feedback, or spam the Discord channel with embed content forwarded unfiltered through `cappedValue = value.slice(0, 1000)`.

**Impact**
Easy denial-of-feedback. Sustained spam pollutes the Discord channel. `@everyone`/`@here` in user-controlled field values are not stripped before being forwarded.

**Recommendation**
1. Add a cheap IP-bucket via Cloudflare Workers KV or Durable Objects: 10 req/min per IP, 100 req/min global. Or enable Cloudflare's native Rate Limiting rule on `/api/feedback`.
2. Strip `@everyone`, `@here`, and Discord mention syntax from every user-supplied field before building the embed.
3. Consider gating on a Turnstile challenge for public-origin browsers — Cloudflare's CAPTCHA-equivalent, one-line to enable.

**Effort estimate:** small (< 1 day) for (1) + (2); (3) optional.

---

### [HIGH-011] IMPL-040 parity test's regex `#"([\d.]+)"#` is fragile against desc copy changes

**Platform:** iOS
**Files:** `3DPrintAssistantTests/EngineServiceTests.swift:230-233`
**Commit:** 24aef66

**Summary**
The test extracts the "chip's emitted number" by matching the first `[\d.]+` substring in the desc. Any future UX change like "0.28 → 0.14 mm" (showing the clamp origin) or "≥0.14 mm" would match the first number — which is no longer the emitted one. Regex-based parsing has no schema, so UI copy edits can silently weaken the invariant.

**Recommendation**
Have the engine return a structured numeric field per chip (e.g. `{ id, name, desc, emittedValue, emittedUnit }`) and compare `emittedValue` directly. Keep the regex as a defensive sanity fallback if desired, but anchor it on a named capture: `(?<value>[\d.]+)\s*mm`.

**Effort estimate:** small (< 1 day)

---

### [HIGH-012] Wrong-printer why-text on non-A1 bedslingers — `outer_wall_speed.why` references "A1/A1 Mini" for MK4, MK4S, Ender-3 V3, Kobra, Mini+

**Platform:** both (engine)
**Files:** `engine.js` (resolveProfile speed branch — search for the literal string `"A1/A1 Mini"`)
**Observed in:** Combo 7 (Prusa MK4 + PLA Silk) and Combo 8 (Prusa MK4S + PETG HF) of [domain-walkthrough.md](domain-walkthrough.md)
**Commit:** c4c5071

**Summary**
For every bedslinger printer whose `max_acceleration` is ≤ 10000, the engine's why-text for `outer_wall_speed` literally says: _"A1/A1 Mini have a 10,000 mm/s² acceleration limit — higher speeds cause ringing on tall prints."_

This text fires correctly on A1 and A1 mini. It also fires incorrectly on:

| Combo | Printer | max_accel | Why-text shown |
|---|---|---|---|
| 7 | Prusa MK4 | 8000 | "A1/A1 Mini have a 10,000 mm/s² acceleration limit…" ❌ |
| 8 | Prusa MK4S | 8000 | same ❌ |

This affects every bedslinger in `printers.json` with `max_acceleration ≤ 10000`: every MK3/MK4/MK4S/CORE One, every Ender-3 V3, every A1/A1 mini, every Kobra, every Mini+. The user sees a why-text naming a completely different printer brand.

Domain-correctness finding: the NUMBER (speed cap) is correct — 40 mm/s for MK4 Quality preset is fine. It's only the why-text that mis-attributes the reason.

**Impact**
Credibility. A Prusa user reads the profile rationale and sees "A1/A1 Mini have a 10,000 mm/s² acceleration limit". Erodes trust in all other why-text shown, which is the engine's main explainability mechanism.

**Recommendation**
Generalise the why-text against `printer.name` + `printer.max_acceleration`:
```js
why: `${printer.name}'s ${printer.max_acceleration.toLocaleString()} mm/s² acceleration limit means outer walls above ~${clampedSpeed + 10} mm/s produce ringing.`
```

**Effort estimate:** trivial

---

### [HIGH-013] `retraction_distance` "scaled for N-mm nozzle" why-text misleading — scaled value equals unscaled base for PLA on 0.8mm nozzle

**Platform:** both (engine, data)
**Files:** `engine.js` (`_scaleRetraction`), `data/materials.json` (PLA Basic `retraction_length: 0.8` vs `retraction_distance` in base_settings)
**Observed in:** Combo 3 (X1C + 0.8mm + PLA) of [domain-walkthrough.md](domain-walkthrough.md)
**Commit:** c4c5071

**Summary**
Combo 3 emits `retraction_distance = 0.8 mm` with why-text _"Retraction scaled for 0.8mm nozzle (base 0.6mm for 0.4mm) — small nozzles need less, large nozzles need more."_

The scaling is mathematically correct: base `retraction_distance: 0.6` × (nozzle ratio, clamped to `retraction_max: 2`) = 0.8. And the advanced filament setting shows `retraction_length = 0.8 mm` (the unscaled base). So the two fields end up equal for the 0.8mm-nozzle case — which is why the harness check flagged "retraction not scaled for nozzle" (the check compares to `retraction_length`).

The why-text claims a scale happened; it did, but the displayed value coincidentally matches the unscaled base. The bigger issue is that **materials have TWO retraction fields** (`retraction_length` and `retraction_distance`) with different values — engine reads one for emission and the other for the filament preset. This is [LOW-003] / [HIGH-001] restated — the data-model confusion is real and visible to users as inconsistent displayed numbers.

**Impact**
Low while export is disabled. When export re-enables, this is exactly the class of drift IMPL-039 was built to eliminate. The walkthrough confirms the root cause is the dual-field materials schema, not the scaling formula.

**Recommendation**
Consolidate `retraction_length` and `retraction_distance` in `data/materials.json` — pick one (prefer `retraction_distance` since it's the per-nozzle-scalable semantic). Update every engine read site. Hard prerequisite before re-enabling export. Already captured as [R5] in `07-recommendations.md` — promote priority.

**Effort estimate:** small (data migration + test)

---

### [HIGH-014] A1 mini data `max_bed_temp: 100` may exceed real hardware cap (Bambu spec: 80°C)

**Platform:** data
**Files:** `data/printers.json` (a1mini entry)
**Observed in:** Combo 5 (A1 mini + PETG Basic) of [domain-walkthrough.md](domain-walkthrough.md)
**Commit:** c4c5071

**Summary**
Bambu's official A1 mini product page lists max bed temperature as **80°C**. The data file records **100°C**. PETG Basic's `bed_temp_max: 85` and `bed_temp_base: 75` — the engine emits `initial_layer_bed_temp: 85°C` which exceeds the real-hardware cap (if Bambu's spec is correct).

The automated check passed because the data's 100°C cap is higher than the emitted 85°C. If the data is corrected to 80°C, [CRITICAL-002]'s fix would flag this combo and clamp.

**Impact**
If confirmed, A1 mini users selecting PETG get a bed temp recommendation the printer's heater can't sustain. Print may still succeed (PETG tolerates a wide bed temp range) but first layer adhesion could suffer, and the preset's stated value differs from what the printer actually does.

**Recommendation**
Owner verification: confirm A1 mini's real max bed temp from Bambu's product page or your own printer. If 80°C, update `data/printers.json`:
```json
"a1mini": { "max_bed_temp": 80, ... }
```
Then [CRITICAL-002] fix automatically covers the downstream symptoms.

**Effort estimate:** trivial (data only, + owner spec lookup)
