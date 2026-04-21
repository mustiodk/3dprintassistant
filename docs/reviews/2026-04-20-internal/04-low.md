# LOW findings

---

### [LOW-001] Sentry DSN in git history at commit `e707df4`

**Platform:** iOS (repo history)
**Files:** `3DPrintAssistant/App/PrintAssistantApp.swift` (historical, commit `e707df4`)

The DSN `https://0aa31ac865f8f0cbeb0fbbb83d6921c8@o4511144446001152.ingest.de.sentry.io/4511157747318864` was hardcoded in commit `e707df4` ("Configure Sentry DSN for beta environment") before being refactored to read from `Info.plist` in `5984352`. It is retrievable from `git log -p` on the public repo.

**Impact:** Sentry DSNs are designed to be public (they ship in every client binary), so the leak is not a privilege escalation. However, an attacker can inject spurious events into your Sentry project, burning quota and polluting dashboards.

**Recommendation:** rotate the DSN (Sentry → Settings → Client Keys → revoke + create new), update `Config.xcconfig`, ship the next build. Do NOT rewrite git history — the value is also in every app binary ever shipped; rotation is the only real mitigation. Optional: Sentry "Inbound Filters" and a per-minute event rate cap to blunt abuse. **Effort:** trivial.

---

### [LOW-002] `data/materials.json` HIPS `enclosure_behavior.reason` text mentions ABS — copy-paste leftover

**Platform:** data
**Files:** `data/materials.json` HIPS entry

Reason string: `"ABS warps severely without enclosure heat. Enclosed chamber holds 45–55°C for reliable layer adhesion."` — should reference HIPS.

**Recommendation:** rewrite the HIPS reason. **Effort:** trivial.

---

### [LOW-003] `data/materials.json` has both `retraction_length` and `retraction_distance` — two names for the same thing

**Platform:** data + engine
**Files:** `data/materials.json`, `engine.js:894, 1762`

Engine reads `retraction_length` in `getAdvancedFilamentSettings` and `retraction_distance` in `resolveProfile`. Both are present on every material. The two names are a synonym cluster that guarantees future drift.

**Recommendation:** pick one canonical name. Delete the other. **Effort:** trivial.

---

### [LOW-004] TPU drying `display` string ("75–85 °C / 8h heatbed") mismatches numeric `heatbed_temp: 80`

**Platform:** data
**Files:** `data/materials.json` TPU 85A and 90A entries

The display text implies a range; the numeric field is a single value. If a consumer reads the number and ignores the string, they get a reasonable but narrower answer. If both reach the UI (one in display, one in export), they disagree.

**Recommendation:** either drop the numeric field and derive from the string at render time, or tighten the string to match the number. **Effort:** trivial.

---

### [LOW-005] `data/nozzles.json` — only `prc_0.2` has a Precision variant

**Platform:** data
**Files:** `data/nozzles.json`

Inconsistent — either add Precision variants for other sizes (if Precision is a real SKU) or drop `prc_0.2` as orphaned.

**Recommendation:** clarify the intent. **Effort:** trivial.

---

### [LOW-006] `data/materials.json` `flexible` field appears twice per material

**Platform:** data
**Files:** `data/materials.json`

Both `properties.flexible` and top-level `flexible` are present and read in different call sites. Dual-source-of-truth.

**Recommendation:** consolidate to one. **Effort:** trivial.

---

### [LOW-007] `engine.js` Bambu preset `version: '2.5.0.14'` hardcoded

**Platform:** both (engine)
**Files:** `engine.js:2087, 2198`

When Bambu Studio bumps its preset-schema version, users see a "migrate on import" popup. No comment, no upgrade strategy.

**Recommendation:** hoist to a module constant with a TODO to re-verify quarterly. Link to Bambu Studio release notes in the comment. **Effort:** trivial.

---

### [LOW-008] `engine.js` `init()` has no per-file try/catch — one malformed JSON breaks startup

**Platform:** both (engine)
**Files:** `engine.js:40-77`

`Promise.all` rejects as a whole. A typo in `troubleshooter.json` (a non-critical data file) takes down the entire engine.

**Recommendation:** wrap each `.json()` in `.catch()` with documented empty-default fallbacks for non-critical files (troubleshooter, slicer_capabilities). Keep hard-fail for printers/materials/nozzles. **Effort:** trivial.

---

### [LOW-009] iOS `testAllBundledResourcesPresent` doesn't check for `da.json`

**Platform:** iOS (tests)
**Files:** `3DPrintAssistantTests/EngineServiceTests.swift:375-395`

`buildFetchData()` loads both `en.json` and `da.json` and throws if either is missing. The presence test only asserts `en.json`. Dropping DA from target membership would ship a crashing build that passes this test.

**Recommendation:** add `("da", "json", "da.lproj")` to the required list. **Effort:** trivial.

---

### [LOW-010] `engine.js` `_SUPPORT_GEOMETRY[support.id] || '0.10'` silent fallback

**Platform:** both (engine)
**Files:** `engine.js:1651`

Adding a new support type to `_SUPPORT_TYPES` without updating `_SUPPORT_GEOMETRY` silently falls back to `'0.10'`.

**Recommendation:** unify the two tables or throw in dev. **Effort:** trivial.
