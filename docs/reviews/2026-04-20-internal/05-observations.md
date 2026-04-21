# Observations (not-a-problem-but-worth-knowing)

---

### [OBS-001] `limits_override` is zero-use across 64 printers

**Files:** `data/printers.json`

The IMPL-039 escape hatch is present in engine code but no printer uses it. Either the formula is genuinely good for everyone (likely for the Bambu/Prusa/Voron axis) or some tighter-firmware printers (`ender3_v3_se`: max_speed 250, max_accel 5000; MK4/S: max_speed 200, max_accel 8000) deserve a conscious second look to confirm the formula-clamped output isn't under-utilising their capability.

**Action:** audit slow/old printers against the emitted profile. Not urgent. If any override is added, ensure nozzle keys are numerically compared (see MEDIUM-001).

---

### [OBS-002] Engine has zero runtime network calls outside `init()`

**Files:** `engine.js:47-58`

Verified via grep for `fetch(`, `XMLHttpRequest`, `sendBeacon`. Good for future API extraction: the engine can be lifted wholesale into a server-side worker with zero network-surface changes.

---

### [OBS-003] localStorage usage is minimal and defensive

**Files:** `app.js:8, 113, 131`, `engine.js:31, 42`

Three keys (`3dpa_notrack`, `3dpa_theme`, `3dpa_lang`), all try/catch-wrapped, no PII, no feedback drafts. feedback-form.js does NOT persist draft text — a deliberate choice per the privacy posture.

---

### [OBS-004] Sentry config is clean on iOS

**Files:** `3DPrintAssistant/App/PrintAssistantApp.swift:11-24`

`sendDefaultPii=false`, `attachScreenshot=false`, `attachViewHierarchy=false`, `tracesSampleRate=0.1`. No `beforeSend` hook, but the only explicit `SentrySDK.capture` point is `EngineService init failed: \(err)` which is safe. Consider a `beforeSend` that scrubs filesystem paths from breadcrumbs if the codebase grows.

---

### [OBS-005] `getFilters(state)` rebuilds all filter arrays on every call

**Files:** `engine.js:220-344`

Today ~5ms per call for 64 printers × 20 materials × 5 nozzles. Web uses patch-in-place via `updateDynamicChipDescs` so the full rebuild is rare; iOS re-renders on every `state.onChange` and pays the full cost. Not a perf problem until the dataset grows ~10× — worth memoising on `(printer+nozzle)` then.

---

### [OBS-006] No `console` polyfill on iOS JSContext

**Files:** `3DPrintAssistant/Engine/EngineService.swift:109-119`

Engine.js currently has zero `console.*` calls (verified via grep). If a future engine edit adds `console.log`, JSCore throws `ReferenceError: Can't find variable: console`. The existing exception handler catches it so the app survives, but logs are lost silently.

**Recommendation:** add a 5-line stub now: `var console = { log(){}, warn(){}, error(){}, info(){}, debug(){} };` — or wire to Swift `print` via `@convention(block)` in debug builds.

---

### [OBS-007] `mapForSlicer` fails open when `_slicerCaps` is null

**Files:** `engine.js:16, 710`

Returns input unchanged if capabilities haven't loaded (pre-`init()`). Defensive but masks ordering bugs. Document the contract: "`mapForSlicer` is only valid after `init()` resolves."

---

### [OBS-008] `vcold.ambient_temp_range: [-20, 5]`

**Files:** `data/rules/environment.json`

Lower bound of −20°C is unrealistic for indoor printing. Not wrong per se — filament hygroscopy curves extend there — but a user selecting "Very Cold" will see suggestions implying they're printing in a freezer.

---

### [OBS-009] Bambu P2S entry may be unreleased product

**Files:** `data/printers.json` (P2S entry)

If P2S isn't a shipping Bambu product as of 2026-04-20, users selecting it will export a preset referencing a printer profile that doesn't exist in their Bambu Studio install. The preset still imports (Bambu Studio treats the printer field as a string) but the user won't be able to print from it until they manually re-parent to a real printer.

**Action:** confirm P2S shipping status. If pre-release, either remove or label explicitly in UI.

---

### [OBS-010] ChatGPT-review remediation history

The prior 21-item review (April 2026, `docs/research/3dprintassistant_ios_master_release_review.md`) has all items resolved per CLAUDE.md. None of the findings in this review duplicate that scope — the IMPL-039/040 work is newer and the concerns here are different classes.
