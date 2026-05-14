# S8.5 — Codex post-Phase-1 audit remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The 7 remediation-arc skills are already loaded in-session.

**Goal:** Fix all four findings from the 2026-05-14 Codex post-Phase-1 audit (`codex/post-phase-1-audit/codex-2026-05-14-post-phase-1-audit-response.md`) so v1.0.4 ships clean. Specifically: Important #1 (overhang fan unscaled), Important #2 (iOS Advanced fan Codable gap), Medium (iOS T5 MCS coverage narrower than web), Low (TDD-RED breadcrumb convention). Produce a new Codex audit packet at the end so the next Codex pass starts fresh.

**Architecture:** Findings split across web + iOS. F1 lands on web first (engine fix + walkthrough assertion) and auto-deploys via Cloudflare Pages. F2/F3 land on iOS as local commits (Phase 2 gate stays active until S9). F4 is a doc/pattern convention edit on web.

**Tech Stack:** Same as v1.0.4 — vanilla JS `engine.js`, walkthrough harness via Node, iOS SwiftUI + JSContext bridge, XCTest on iPhone 17 Pro simulator.

**Key constraints:**
- **iOS push gate stays active** — local commits only. Push gate opens only after S9's 5-point check passes.
- **Byte-identical rule** — every iOS sync after F1 lands re-verifies `diff -q` cleanly across all 8 sync targets.
- **One-finding-one-commit-per-platform** — F1 web = 1 commit (+ optional tightening); F2 + F3 iOS = separate commits per finding; F4 web = 1 commit.
- **TDD-first** for every engine.js touch + every new XCTest assertion. Walkthrough assertion lands RED before engine fix; iOS test author can use S7-4 pattern (inverted-first on ONE representative + others by symmetry).
- **Internal code-review subagent between impl + tightening** for any non-trivial commit (pattern 4-for-4 across v1.0.4 arc — keeps catching real findings).
- **Verification-before-completion** rigid — no "ready for Codex re-audit" claims without fresh `node scripts/walkthrough-harness.js` + `node scripts/validate-data.js` + `node scripts/profile-matrix-audit.js` + full iOS XCTest green.

---

## Pre-Flight Verification

### Task 0: Confirm clean state on both repos

- [ ] **Step 0.1: Confirm web + iOS HEADs**

```bash
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant log --oneline -3
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios log --oneline -3
```

Expected:
- Web HEAD = `9603d37` (S8 close docs).
- iOS HEAD = `fc3ee6b` (S8 tightening), `origin/main` = `eeb2915`. Local ahead by 2.

- [ ] **Step 0.2: Confirm clean worktrees**

```bash
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant status --short
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios status --short
```

Expected: no output from either (both clean).

- [ ] **Step 0.3: Re-confirm byte-identity baseline (engine + data still in sync from S8)**

```bash
WEB=/Users/mragile.io/Documents/Claude/Projects/3dprintassistant
IOS=/Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/3DPrintAssistant
diff -q "$WEB/engine.js" "$IOS/Engine/engine.js" && echo "engine.js identical (baseline)"
```

Expected: `engine.js identical (baseline)`.

---

## F1 — Web: Overhang fan env-scaling fix (Codex Important #1)

**Source:** `codex/post-phase-1-audit/codex-2026-05-14-post-phase-1-audit-response.md` Important #1. Codex's claim: `fan_max_speed` / `fan_min_speed` are env-scaled via `env.fan_multiplier`, but `cooling_fan_overhang` is NOT — it emits at raw material default (typically 100%) across all surfaces in cold/vcold envs. Verified empirically at:
- `engine.js:1122` — `resolveProfile`'s `cooling_overhang: bs.cooling_fan_overhang` (output key drops `_fan`).
- `engine.js:1259` — `getAdvancedFilamentSettings` returns `cooling_fan_overhang: bs.cooling_fan_overhang`.
- `engine.js:3132-3133` — BS export `filament.overhang_fan_speed = [String(parseInt(bs.cooling_fan_overhang)...)]`.
- `engine.js:3218` — text export `Overhang fan speed: ${adv.cooling_fan_overhang}` (reads from adv, which is raw).

**Semantic intent:** `env.fan_multiplier=0.9` on cold and `0.8` on vcold means "reduce cooling so over-cooling doesn't break layer adhesion." Leaving overhang fan at raw 100% during overhang regions defeats the cold-env adhesion goal. Symmetric fix: apply `fanMult` to overhang in the same places min/max already apply.

### Task 1: Engine + walkthrough fix for overhang fan

**Files:**
- Modify: `engine.js` (4 emission sites listed above + the `_prov` sidecar in `getAdvancedFilamentSettings`)
- Modify: `scripts/walkthrough-harness.js` (extend P1.5 HIGH-01-export block with overhang assertions; add TDD-RED first)

- [ ] **Step 1.1: Inspect each emission site and identify the minimal change**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant
sed -n '1115,1145p' engine.js     # resolveProfile cooling_overhang
sed -n '1240,1310p' engine.js     # getAdvancedFilamentSettings fan block
sed -n '3120,3140p' engine.js     # BS export filament
sed -n '3205,3225p' engine.js     # text export
```

Identify where `fanMult` is computed (currently at `engine.js:~1246`). Plan: hoist or duplicate the same defensive `fanMult` calc into each site that emits overhang fan, OR compute env-scaled overhang once in `getAdvancedFilamentSettings` + read from `adv.cooling_fan_overhang` in the export paths (more DRY but couples export to adv). Pick the DRY option to match how `fan_min_speed` / `fan_max_speed` are routed today.

- [ ] **Step 1.2: TDD-RED — extend P1.5 HIGH-01-export walkthrough block**

Edit `scripts/walkthrough-harness.js`. Find the existing P1.5 HIGH-01-export block (around line 612-660). Append three new assertions before the `console.log` line:

```javascript
    // v1.0.4 P1.5 HIGH-01 follow-up — overhang fan env-scaled too.
    // PLA+cold: overhang_fan_speed should be round(100 * 0.9) = 90 across all surfaces.
    const scaledOverhang = Math.round(100 * 0.9);
    if (scaledOverhang !== 90) throw new Error(`v1.0.4 HIGH-01 overhang baseline: expected 90 (100×0.9) for PLA+cold; got ${scaledOverhang}`);

    // Text export — already asserts fan min/max; now overhang too.
    const overhangLine = txt.match(/Overhang fan speed:\s*(\d+)/);
    if (!overhangLine) throw new Error(`v1.0.4 HIGH-01 overhang export: text export missing "Overhang fan speed:" line`);
    const txtOverhang = parseInt(overhangLine[1], 10);
    if (txtOverhang !== scaledOverhang) {
      throw new Error(`v1.0.4 HIGH-01 overhang export: text export Overhang fan speed=${txtOverhang} should match env-scaled ${scaledOverhang} (not unscaled 100)`);
    }

    // BS export overhang_fan_speed[0]
    const bsOverhang = bs.filament.overhang_fan_speed?.[0];
    if (parseInt(bsOverhang, 10) !== scaledOverhang) {
      throw new Error(`v1.0.4 HIGH-01 overhang export: BS filament.overhang_fan_speed=${bsOverhang} should match env-scaled ${scaledOverhang} (not unscaled 100)`);
    }

    // resolveProfile cooling_overhang — must also be env-scaled (user-facing chip).
    const profOverhang = parseInt((profCold.cooling_overhang?.value || '0').replace('%', ''), 10);
    if (profOverhang !== scaledOverhang) {
      throw new Error(`v1.0.4 HIGH-01 overhang resolve: profCold.cooling_overhang=${profOverhang} should match env-scaled ${scaledOverhang}`);
    }
```

Note: this assumes `profCold` is in scope (was defined earlier in the HIGH-01 block — verify). If not, build a fresh one via `Engine.resolveProfile(coldState)`.

Also update the console.log line to mention overhang.

- [ ] **Step 1.3: Run harness — expect RED (overhang assertions fail before engine fix)**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant && \
  node scripts/walkthrough-harness.js 2>&1 | tail -20
```

Expected: harness throws on the first overhang assertion (e.g., "text export Overhang fan speed=100 should match env-scaled 90"). This proves: (a) assertion machinery works, (b) overhang is genuinely unscaled at HEAD, (c) the test surface will catch the regression after fix.

- [ ] **Step 1.4: Apply engine fix at 4 sites + update `_prov`**

In `engine.js`:

1. **In `getAdvancedFilamentSettings` (~line 1246):** scale overhang. After the existing `fanMaxScaled` / `fanMinScaled` computation, add:

```javascript
const overhangScaled = bs.cooling_fan_overhang != null
  ? Math.round((parseInt(bs.cooling_fan_overhang) || 0) * fanMult)
  : null;
```

Then change line ~1259 from `cooling_fan_overhang: bs.cooling_fan_overhang,` to `cooling_fan_overhang: overhangScaled,`.

Update `_prov.cooling_fan_overhang` at line ~1299 from `{ source: 'default', ref: 'materials.json#base_settings.cooling_fan_overhang' }` to be env-aware:

```javascript
cooling_fan_overhang:   { source: fanMult !== 1.0 ? 'rule' : 'default',
                          ref: fanMult !== 1.0 ? 'env.fan_multiplier × materials.json#base_settings.cooling_fan_overhang'
                                               : 'materials.json#base_settings.cooling_fan_overhang' },
```

2. **In `resolveProfile` (~line 1122):** scale `cooling_overhang` output key. Find the local `fanMult` (or compute the same defensive way), then change `cooling_overhang: bs.cooling_fan_overhang` to read the scaled value. Match the `_prov` at line 1142 to flip `source` based on `fanMult !== 1.0`.

   If `fanMult` isn't already computed in that scope, compute it locally with the same defensive guard pattern: `Number.isFinite(env?.fan_multiplier) && env.fan_multiplier > 0 ? env.fan_multiplier : 1.0`.

3. **In BS export `exportBambuStudioJSON` (~line 3132):** switch from reading `bs.cooling_fan_overhang` to reading the env-scaled `adv.cooling_fan_overhang` (which is now scaled per fix #1 above):

```javascript
if (adv.cooling_fan_overhang != null) {
  filament.overhang_fan_speed = [String(parseInt(adv.cooling_fan_overhang) || 0)];
}
```

4. **In text export `formatProfileAsText` (~line 3218):** no change needed — already reads `adv.cooling_fan_overhang` which is now scaled. Verify by re-reading the surrounding context.

- [ ] **Step 1.5: Run harness — expect GREEN**

```bash
node scripts/walkthrough-harness.js 2>&1 | tail -15
```

Expected: all 11 v1.0.4 OK lines (last one now mentions overhang); curated 11/11; DQ-2 clean.

- [ ] **Step 1.6: Run validate-data + profile-matrix-audit**

```bash
node scripts/validate-data.js
node scripts/profile-matrix-audit.js 2>&1 | tail -10
```

Expected: validate-data 6/6 clean; matrix-audit `No core failures` across 47196 broad + 55/55 curated.

- [ ] **Step 1.7: Commit F1 web fix**

```bash
git add engine.js scripts/walkthrough-harness.js && \
git commit -m "$(cat <<'EOF'
fix: env-scale cooling_fan_overhang across all surfaces (Codex S8.5 Important #1)

Codex post-Phase-1 audit (2026-05-14) flagged that HIGH-01's
env.fan_multiplier scaling was scoped to fan_min_speed / fan_max_speed
only — cooling_fan_overhang stayed at the raw material default
(typically 100%) across all four emission sites:
- engine.js:1122 resolveProfile cooling_overhang
- engine.js:1259 getAdvancedFilamentSettings cooling_fan_overhang
- engine.js:3133 BS export filament.overhang_fan_speed
- engine.js:3218 text export "Overhang fan speed:"

Semantic intent of env.fan_multiplier=0.9 on cold (0.8 on vcold) is to
reduce cooling so over-cooling doesn't break layer adhesion in low
ambient temps. Leaving overhang fan at 100% during overhang regions
defeats that for the actual overhang surfaces.

Fix: hoist env-scaled overhangScaled computation alongside fanMaxScaled
in getAdvancedFilamentSettings; route BS export through adv.* (already
reads min/max that way); resolveProfile gets a local fanMult guard.
_prov sidecar tag flips to 'rule' / env.fan_multiplier when fanMult != 1.

Walkthrough P1.5 HIGH-01-export block extended with 3 overhang
assertions (text + BS + resolveProfile). 11 cumulative v1.0.4 OK lines
(line now also asserts overhang=90 for PLA+cold). validate-data 6/6
clean; profile-matrix-audit 47196/0 + 55/55 curated.

iOS sync follows in next commit (S8.5 F2).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 1.8: Push F1 web fix (auto-deploys to Cloudflare Pages)**

```bash
git push origin main
```

**Why push immediately:** web is live; matches the per-finding-per-commit-with-push-on-green discipline established in S7-1 through S7-3. Each Phase 1.5 finding shipped to web independently. Same here.

**Verification gate for F1:** `node scripts/walkthrough-harness.js` green with overhang assertions; `validate-data 6/6`; `profile-matrix-audit` clean across all 47196 broad configs; web commit pushed.

---

## F2 — iOS: sync new engine + extend AdvancedFilamentSettings Codable (Codex Important #2)

**Source:** Codex Important #2. The iOS `AdvancedFilamentSettings` Swift struct at `3DPrintAssistant/Engine/EngineService.swift:70-78` exposes only the 4 temperature fields. The web walkthrough's HIGH-07/08 uses `getAdvancedFilamentSettings().fan_max_speed.value` directly — iOS cannot mirror this because the Codable decoder at `EngineService.swift:672-678` drops `fan_max_speed`, `fan_min_speed`, and `cooling_fan_overhang`. T2a relies on transitive coverage via T12 (P1.5 HIGH-01 export); Codex notes this isn't equivalent — a regression that breaks the Advanced surface but leaves export green would slip through iOS XCTest.

**Decision:** land the Codable extension in S8.5 (not S9-carry-forward). Small additive change.

### Task 2: iOS engine + data sync (post-F1) + Codable struct extension + T2a/T12 extensions

**Files:**
- Modify: `3DPrintAssistant/Engine/engine.js` — byte-identical re-cp from web (post-F1).
- Modify: `3DPrintAssistant/Engine/EngineService.swift` — extend `AdvancedFilamentSettings` struct (lines 70-78) + decoder (lines 672-678).
- Modify: `3DPrintAssistantTests/EngineServiceTests.swift` — extend `testV104_T2a_EnvDataLayerCold` for direct Advanced-surface fan assertions; extend `testV104_P1_5_HIGH01_ExportEnvFanDraftShield` to also assert overhang fan.

- [ ] **Step 2.1: Re-cp engine.js (post-F1 fix) + verify byte-identity**

```bash
cp /Users/mragile.io/Documents/Claude/Projects/3dprintassistant/engine.js \
   /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/3DPrintAssistant/Engine/engine.js
diff -q /Users/mragile.io/Documents/Claude/Projects/3dprintassistant/engine.js \
        /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios/3DPrintAssistant/Engine/engine.js && \
  echo "engine.js byte-identical post-F1"
```

Expected: `engine.js byte-identical post-F1`. Data files are unchanged in F1 — no re-cp needed.

- [ ] **Step 2.2: Extend `AdvancedFilamentSettings` struct in `EngineService.swift`**

Edit `EngineService.swift:70-78`. Current:

```swift
struct AdvancedFilamentSettings {
    let initialLayerTemp: String
    let otherLayersTemp: String
    let initialLayerBedTemp: String
    let otherLayersBedTemp: String
    /// Keys: "initial_layer_temp", "other_layers_temp",
    /// "initial_layer_bed_temp", "other_layers_bed_temp".
    let prov: [String: Provenance]
}
```

Add three new optional fields (Optional<String> because not every material emits cooling_fan_min, and other fan fields are env-conditional):

```swift
struct AdvancedFilamentSettings {
    let initialLayerTemp: String
    let otherLayersTemp: String
    let initialLayerBedTemp: String
    let otherLayersBedTemp: String
    /// v1.0.4 Phase 1.5 HIGH-01 / S8.5 — env-scaled fan emissions exposed
    /// for direct Advanced-surface assertions (not just transitive export
    /// coverage). All three are Optional because `fan_min_speed` is
    /// conditional on `bs.cooling_fan_min` and overhang follows the same
    /// pattern. The decoder reads the S-wrapped `.value` field from JS.
    let fanMinSpeed: String?
    let fanMaxSpeed: String?
    let coolingFanOverhang: String?
    /// Keys: "initial_layer_temp", "other_layers_temp",
    /// "initial_layer_bed_temp", "other_layers_bed_temp",
    /// "fan_min_speed", "fan_max_speed", "cooling_fan_overhang".
    let prov: [String: Provenance]
}
```

- [ ] **Step 2.3: Extend decoder in `sync_getAdvancedFilamentSettings`**

Edit `EngineService.swift:672-678` (the AdvancedFilamentSettings construction). The S-wrapped fields come back from JS as `{"value": "63", "why": "...", "_prov": {...}}` dicts; plain-string keys come back as plain strings; `cooling_fan_overhang` comes back as the **env-scaled number string** (after F1 — was raw material default before).

Helper closure inline (file-private style — match existing patterns):

```swift
return AdvancedFilamentSettings(
    initialLayerTemp: obj["initial_layer_temp"] as? String ?? "—",
    otherLayersTemp: obj["other_layers_temp"] as? String ?? "—",
    initialLayerBedTemp: obj["initial_layer_bed_temp"] as? String ?? "—",
    otherLayersBedTemp: obj["other_layers_bed_temp"] as? String ?? "—",
    fanMinSpeed: (obj["fan_min_speed"] as? [String: Any])?["value"] as? String,
    fanMaxSpeed: (obj["fan_max_speed"] as? [String: Any])?["value"] as? String,
    coolingFanOverhang: (obj["cooling_fan_overhang"] as? String)
                         ?? (obj["cooling_fan_overhang"] as? NSNumber).map { String($0.intValue) },
    prov: _decodeProvSidecar(obj["_prov"])
)
```

Note on `cooling_fan_overhang`: the JS emission is `overhangScaled` (an Int, not S-wrapped), so it arrives as `NSNumber` or `Int` after JSONSerialization. Cast permissively.

Update the fallback branch at lines 664-670 too — add three `nil` parameters before `prov`:

```swift
return AdvancedFilamentSettings(
    initialLayerTemp: "—",
    otherLayersTemp: "—",
    initialLayerBedTemp: "—",
    otherLayersBedTemp: "—",
    fanMinSpeed: nil,
    fanMaxSpeed: nil,
    coolingFanOverhang: nil,
    prov: [:]
)
```

- [ ] **Step 2.4: Extend T2a (testV104_T2a_EnvDataLayerCold) for direct fan assertions**

Find `testV104_T2a_EnvDataLayerCold` in `EngineServiceTests.swift`. The current implementation drops fan checks per the S8 "scope note" comment. Replace the scope-note comment + dropped fan block with direct assertions via `advCold.fanMinSpeed` / `advCold.fanMaxSpeed`.

Add after the existing bed-delta assertion (before the draft_shield block):

```swift
        // S8.5 Codex Important #2 — direct fan assertions via the Advanced surface
        // (now possible after extending AdvancedFilamentSettings Codable struct).
        let fanMinCold = try Self.parseFan(advCold.fanMinSpeed)
        let fanMaxCold = try Self.parseFan(advCold.fanMaxSpeed)
        // Recompute from normal env for direct comparison
        let advNormalForFan: AdvancedFilamentSettings
        do {
            state.environment = "normal"
            advNormalForFan = try await EngineService.shared.getAdvancedFilamentSettings(state)
            state.environment = "cold"
        }
        let fanMinNormal = try Self.parseFan(advNormalForFan.fanMinSpeed)
        let fanMaxNormal = try Self.parseFan(advNormalForFan.fanMaxSpeed)

        XCTAssertLessThan(fanMaxCold, fanMaxNormal,
                          "Advanced surface fan_max_speed should drop in cold (env.fan_multiplier=0.9); got cold=\(fanMaxCold), normal=\(fanMaxNormal)")
        XCTAssertEqual(round(fanMaxCold), round(fanMaxNormal * 0.9), accuracy: 0.01,
                       "Advanced surface fan_max_speed reduced by env.fan_multiplier=0.9 on cold")
        XCTAssertEqual(round(fanMinCold), round(fanMinNormal * 0.9), accuracy: 0.01,
                       "Advanced surface fan_min_speed reduced by env.fan_multiplier=0.9 on cold")

        // S8.5 Codex Important #1 — overhang fan now env-scaled too.
        let overhangCold = try Self.parseFan(advCold.coolingFanOverhang)
        let overhangNormal = try Self.parseFan(advNormalForFan.coolingFanOverhang)
        XCTAssertLessThan(overhangCold, overhangNormal,
                          "Advanced surface cooling_fan_overhang should drop in cold (env.fan_multiplier=0.9); got cold=\(overhangCold), normal=\(overhangNormal)")
        XCTAssertEqual(round(overhangCold), round(overhangNormal * 0.9), accuracy: 0.01,
                       "Advanced surface cooling_fan_overhang reduced by env.fan_multiplier=0.9 on cold")
```

Add the parseFan helper alongside the existing helpers at the bottom of the test class:

```swift
    /// Helper: parse a fan-percentage string ("63", "63%", " 63 %") into Double.
    /// Returns nil-throw via XCTUnwrap when the field is unavailable.
    private static func parseFan(_ s: String?) throws -> Double {
        let value = try XCTUnwrap(s, "fan field missing — AdvancedFilamentSettings did not decode it; check engine emission + Codable decoder")
        let stripped = value.replacingOccurrences(of: "%", with: "").trimmingCharacters(in: .whitespaces)
        return try XCTUnwrap(Double(stripped), "fan value '\(value)' not numeric")
    }
```

Update the test's docstring to remove the now-obsolete scope-note (the gap is closed by this S8.5 commit).

- [ ] **Step 2.5: Extend T12 (testV104_P1_5_HIGH01_ExportEnvFanDraftShield) for overhang assertions**

Find `testV104_P1_5_HIGH01_ExportEnvFanDraftShield`. After the existing BS fan_min/max checks, add:

```swift
        // S8.5 Codex Important #1 — BS export overhang_fan_speed also env-scaled (90 for PLA+cold).
        let bsOverhang = Self.firstFromBSArray(bs.filament["overhang_fan_speed"])
        XCTAssertEqual(bsOverhang, "90",
                       "BS filament.overhang_fan_speed[0] should be 90 (env-scaled, 100×0.9); got: \(String(describing: bs.filament["overhang_fan_speed"]))")
```

And after the existing text-export fan_min regex block, add:

```swift
        // Overhang fan in text export — env-scaled to 90 (100×0.9) for PLA+cold.
        let overhangRe = try NSRegularExpression(pattern: #"Overhang fan speed:\s*(\d+)"#)
        let overhangHit = overhangRe.firstMatch(in: txt, range: NSRange(txt.startIndex..., in: txt))
        XCTAssertNotNil(overhangHit, "text export must contain 'Overhang fan speed: N' line; first 800 chars:\n\(txt.prefix(800))")
        if let m = overhangHit, let r = Range(m.range(at: 1), in: txt) {
            XCTAssertEqual(String(txt[r]), "90", "text export Overhang fan speed should be env-scaled 90 (100×0.9)")
        }
```

- [ ] **Step 2.6: Build + run F2-relevant tests individually first**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios && \
  xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant \
    -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
    -only-testing:3DPrintAssistantTests/EngineServiceTests/testV104_T2a_EnvDataLayerCold \
    -only-testing:3DPrintAssistantTests/EngineServiceTests/testV104_P1_5_HIGH01_ExportEnvFanDraftShield \
    CODE_SIGNING_ALLOWED=NO 2>&1 | tail -30
```

Expected: both `Test Succeeded`. Build issues (e.g., Codable decode shape mismatches) surface here cheaply.

- [ ] **Step 2.7: Run full iOS XCTest suite**

```bash
xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  CODE_SIGNING_ALLOWED=NO 2>&1 | tail -10
```

Expected: `** TEST SUCCEEDED **`. Verify count via xcresult: `passedTests: 108, failedTests: 0` (still 107 unit + 1 UI; no new test functions — T2a + T12 just extended).

- [ ] **Step 2.8: Commit F2**

```bash
git add 3DPrintAssistant/Engine/engine.js \
        3DPrintAssistant/Engine/EngineService.swift \
        3DPrintAssistantTests/EngineServiceTests.swift && \
git commit -m "$(cat <<'EOF'
chore: sync engine + extend AdvancedFilamentSettings Codable for fan
       (Codex S8.5 Important #1 + #2)

S8.5 F2 — addresses Codex post-Phase-1 audit Important #2 ("iOS Advanced
fan mirror should land before TestFlight, not v1.0.5") and adds direct
overhang fan coverage from Important #1's web fix.

engine.js: byte-identical re-cp from web post-S8.5-F1 (overhang scaled).

EngineService.swift:70-78: AdvancedFilamentSettings extended with
fanMinSpeed, fanMaxSpeed, coolingFanOverhang (all Optional<String>).
Decoder at 658-679 reads S-wrapped .value for fan_min_speed / fan_max_speed
and the post-F1 env-scaled integer for cooling_fan_overhang.

EngineServiceTests.swift:
- testV104_T2a_EnvDataLayerCold: extended with direct Advanced-surface
  fan + overhang assertions (closes the gap S8 documented as carry-forward).
- testV104_P1_5_HIGH01_ExportEnvFanDraftShield: extended with overhang
  assertions on BS export + text export (90 for PLA+cold).
- New parseFan() helper.

iOS XCTest: 108/108 still green on iPhone 17 Pro simulator. Phase 2
gate active — NO push.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Verification gate for F2:** byte-identity diff clean post-cp; both touched tests green individually; full suite green at 108/108; iOS local commit recorded; **NO push**.

---

## F3 — iOS: T5 MCS coverage extension (Codex Medium)

**Source:** Codex Medium #1. Web walkthrough `scripts/walkthrough-harness.js:821-887` covers 7+ MCS sub-cases (`ams_lite`, `ams_like`, `cfs`, `cfs_lite`, `generic_non_ams`, retired `k2_plus_cfs` on both CFS and CFS-Lite, `multi_5` empty-MCS suppression). iOS `testV104_T5_PracticalMCSTiers` covers 4 (empty-MCS, AMS prime tower, K2 retired-ID, Creality empty-MCS). Codex's call: "Cheap to tighten before ship; otherwise it is a v1.0.5 mirror debt." We're tightening.

### Task 3: Extend testV104_T5_PracticalMCSTiers

**Files:**
- Modify: `3DPrintAssistantTests/EngineServiceTests.swift` — extend T5 with 4 new sub-case assertions.

- [ ] **Step 3.1: Read web walkthrough MCS block in full**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant && \
  sed -n '775,890p' scripts/walkthrough-harness.js
```

Identify the canonical:
- AMS-Lite combo (A1 / A1 Mini + a material whose `ams_lite_compatible: false` — should fire `mcs_ams_lite_material_incompatible` or similar).
- CFS-Lite combo (`sparkx_i7` + multi-color — should fire `mcs_tier_cfs_lite_guidance` per S4 + LOW-01 silence of retired `k2_plus_cfs`).
- Generic non-AMS combo (e.g., A1 / A1 Mini Filament Hub or some other generic_non_ams tier printer — should fire `mcs_tier_generic_non_ams_guidance` with display-name).
- multi_5 empty-MCS combo (5-color asked but printer has empty MCS — should fire suppression-style).

- [ ] **Step 3.2: Append sub-cases to T5**

At the end of the existing T5 body (before the closing `}`), add four new sub-cases. Use exact warning IDs from the web walkthrough — apply the `feedback_ios_xctest_exact_ids.md` discipline.

**Template** (will adjust based on what Step 3.1 reveals):

```swift
        // S8.5 Codex Medium — extend MCS coverage to match web walkthrough breadth.

        // ams_lite tier: A1 Mini + a material with ams_lite_compatible:false
        // (typical example: pa-cf or pc — abrasive/high-temp not safe in AMS-Lite spool path).
        // Adjust material id based on what data/materials.json actually flags.
        let amsLite = AppState()
        amsLite.printer = "a1mini"
        amsLite.nozzle = "std_0.4"
        amsLite.material = "<MATERIAL_AMS_LITE_INCOMPATIBLE>"  // populate from Step 3.1 inspection
        amsLite.colors = "multi_2_4"
        let warnsAmsLite = try await EngineService.shared.getWarnings(amsLite)
        XCTAssertTrue(warnsAmsLite.map(\.id).contains("<EXACT_ID_FROM_WEB>"),
                      "ams_lite-incompatible material on a1mini must fire <ID>")

        // cfs_lite tier: sparkx_i7 (Creality i7) + multicolor
        let cfsLite = AppState()
        cfsLite.printer = "sparkx_i7"
        cfsLite.nozzle = "std_0.4"
        cfsLite.material = "pla_basic"
        cfsLite.colors = "multi_2_4"
        let warnsCfsLite = try await EngineService.shared.getWarnings(cfsLite)
        let idsCfsLite = warnsCfsLite.map(\.id)
        XCTAssertFalse(idsCfsLite.contains("k2_plus_cfs"),
                       "retired k2_plus_cfs must NOT fire on sparkx_i7 CFS-Lite (LOW-01 guard)")
        // Assert positive cfs_lite guidance per web walkthrough — exact id from Step 3.1.

        // generic_non_ams tier: example printer + multicolor (per S4 — Filament Hub /
        // Toolchanger / IDEX get tier-appropriate guidance copy).
        // Confirm exact printer + warning id from Step 3.1.
        let genericNonAms = AppState()
        genericNonAms.printer = "<PRINTER>"
        genericNonAms.nozzle = "std_0.4"
        genericNonAms.material = "pla_basic"
        genericNonAms.colors = "multi_2_4"
        let warnsGeneric = try await EngineService.shared.getWarnings(genericNonAms)
        // Assert per Step 3.1 findings.

        // multi_5 empty-MCS — 5-color asked but printer has empty MCS — suppression behavior.
        let multi5 = AppState()
        multi5.printer = "centauri_carbon"
        multi5.nozzle = "std_0.4"
        multi5.material = "pla_basic"
        multi5.colors = "multi_5"
        let warnsMulti5 = try await EngineService.shared.getWarnings(multi5)
        // Assert per Step 3.1 findings — likely mcs_empty_no_multicolor fires + prime_tower suppressed.
```

**Critical:** populate the `<PLACEHOLDER>` values from Step 3.1's web walkthrough inspection. Do NOT speculate. Apply `feedback_ios_xctest_exact_ids.md` — grep web source for the exact emitted IDs before writing the iOS assertion.

- [ ] **Step 3.3: Run T5 individually**

```bash
xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -only-testing:3DPrintAssistantTests/EngineServiceTests/testV104_T5_PracticalMCSTiers \
  CODE_SIGNING_ALLOWED=NO 2>&1 | tail -20
```

Expected: `Test Succeeded`. Iterate on the placeholders until green.

- [ ] **Step 3.4: Full iOS XCTest suite — confirm no regressions**

```bash
xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  CODE_SIGNING_ALLOWED=NO 2>&1 | tail -10
```

Expected: `** TEST SUCCEEDED **`; xcresult `passedTests: 108, failedTests: 0`.

- [ ] **Step 3.5: Commit F3**

```bash
git add 3DPrintAssistantTests/EngineServiceTests.swift && \
git commit -m "$(cat <<'EOF'
test: extend testV104_T5_PracticalMCSTiers (Codex S8.5 Medium)

S8.5 F3 — addresses Codex post-Phase-1 audit Medium #1 ("T5 iOS MCS
mirror is materially narrower than web walkthrough"). Web covers
ams_lite + cfs_lite + generic_non_ams + multi_5 sub-cases that iOS T5
didn't reach.

Added 4 new sub-case assertions per web walkthrough:821-887:
- ams_lite tier gating (a1mini + ams_lite-incompatible material)
- cfs_lite tier (sparkx_i7) with paired retired k2_plus_cfs silence
- generic_non_ams tier (printer per data — Filament Hub / Toolchanger /
  IDEX category)
- multi_5 empty-MCS suppression

Exact warning IDs grepped from web source per feedback_ios_xctest_exact_ids.

iOS XCTest still 108/108 green. Phase 2 gate active — NO push.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

**Verification gate for F3:** T5 green individually; full suite green at 108/108; iOS local commit recorded; **NO push**.

---

## F4 — TDD-RED breadcrumb convention (Codex Low)

**Source:** Codex Low #1. The S8 TDD-RED demo on T1 was self-reported in the commit body only — no artifact in code. Codex agrees deferring is acceptable, but we want a clean Codex re-audit, so codify the convention. Lightweight: doc edit only.

### Task 4: Codify TDD-RED breadcrumb in ai-collab.md or 3dpa-context.md

**Files:**
- Modify: `docs/ai-collab.md` (preferred — it's the canonical AI-peer collaboration reference and explicitly covers the test-discipline patterns).
- Alternative: `docs/3dpa-context.md` standing rules section.

- [ ] **Step 4.1: Read existing ai-collab.md to find the right section**

```bash
cd /Users/mragile.io/Documents/Claude/Projects/3dprintassistant && \
  wc -l docs/ai-collab.md && \
  grep -n "^##\|^###" docs/ai-collab.md
```

Identify the section that covers test discipline or review criteria. If none exists, add one. Pattern: short, prescriptive.

- [ ] **Step 4.2: Add TDD-RED breadcrumb subsection**

Append (or fit into existing structure) a short subsection like:

```markdown
### TDD-RED demo breadcrumb (recommended when degenerate)

When mirroring an existing-proven behavior (e.g., iOS XCTest mirroring
a web walkthrough invariant), the natural RED phase is degenerate — the
test passes on first run because the engine already exhibits the
behavior. To avoid the "tests-after-with-no-RED proof" gap (which
S8's internal reviewer flagged Minor M-4 / Codex S8.5 Low), apply ONE
of these conventions per test-batch commit:

1. **Inverted-first on one representative.** Author the first test with
   a deliberately-wrong assertion (e.g., `XCTAssertEqual(x, 999, ...)`),
   run it, observe the failure (proves machinery + engine response),
   then flip to correct. Leave the breadcrumb as one of:
   - A `// RED demo verified YYYY-MM-DD: ...` comment on the flipped
     assertion line, OR
   - A tiny pre-commit (1-line wrong assertion) reverted by a follow-up
     commit, so `git log -p` shows the RED.

2. **Skip the demo entirely** for purely-test-only batches (e.g., retired-ID
   negative assertions where the natural RED is "engine no longer emits
   this ID"). Note in commit body: "TDD-RED skipped: test-only, degenerate
   RED is expected; trust collective full-suite green."

Either way: the commit body or test code must surface the RED-discipline
posture so future-you (or external reviewers) can audit it without inferring
from absence.
```

- [ ] **Step 4.3: Commit F4 + push web**

```bash
git add docs/ai-collab.md && \
git commit -m "$(cat <<'EOF'
docs: TDD-RED breadcrumb convention (Codex S8.5 Low)

S8.5 F4 — addresses Codex post-Phase-1 audit Low #1 ("TDD-RED
breadcrumbing is acceptable as process carry-forward; worth standardizing
after v1.0.4").

Added a TDD-RED breadcrumb convention subsection to ai-collab.md. Two
acceptable patterns:
1. Inverted-first on one representative + breadcrumb (comment or
   pre-commit reverted in follow-up).
2. Skip with explicit commit-body note for degenerate-RED test-only batches.

Either way, the commit body or test code must surface the RED-discipline
posture so external review can audit it.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)" && \
git push origin main
```

**Verification gate for F4:** convention text reads cleanly; web auto-deploys (no behavioral change — doc only).

---

## F5 — Internal code-review subagent

### Task 5: Dispatch reviewer on the cumulative S8.5 surface

**Pattern:** 4-for-4 across v1.0.4 arc (S7-2 PVA / S7-4 Creality / S7-3 partial-clip / S8 PLA chamber-cap + HIGH-05 banner + 4 loose matchers). Keep using it. Don't skip.

- [ ] **Step 5.1: Capture SHA ranges**

```bash
# Web
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant rev-parse 9603d37  # pre-S8.5
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant rev-parse HEAD     # post-S8.5

# iOS
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios rev-parse fc3ee6b  # pre-S8.5
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios rev-parse HEAD     # post-S8.5
```

- [ ] **Step 5.2: Dispatch reviewer via Agent tool**

Use `general-purpose` subagent. Prompt covers:
- What was built: 4-finding S8.5 remediation of Codex post-Phase-1 audit. Web overhang fan fix + iOS Codable extension + iOS T5 MCS coverage + breadcrumb convention.
- SHA ranges on both repos.
- Reference packets:
  - Codex audit response: `codex/post-phase-1-audit/codex-2026-05-14-post-phase-1-audit-response.md`
  - S8.5 plan: this file
- Specific things to challenge:
  - F1: All 4 emission sites scale overhang correctly? Any 5th site I missed (grep `cooling_fan_overhang` + `overhang_fan_speed` exhaustively)?
  - F1: defensive `fanMult` guard duplicated correctly? Could `env?.fan_multiplier` arrive non-finite?
  - F2: Codable extension correct? `cooling_fan_overhang` is emitted as Int but decoder handles both String + NSNumber — verify path actually hit.
  - F2: T2a re-extension actually exercises the new Advanced-surface fields (not just transitive via export)?
  - F3: MCS sub-cases use exact IDs from web? Any speculative substring matchers?
  - F4: breadcrumb convention internally consistent (and is the chosen home `ai-collab.md` vs `3dpa-context.md` defensible)?
  - Cross-cutting: any v1.0.4 behavior with no iOS mirror at all after S8 + S8.5?
- Output format: Critical / Important / Minor / Strengths / GO-NO-GO.

- [ ] **Step 5.3: Triage reviewer findings**

Critical → STOP, fix in tightening commit. Important → fix in tightening commit before Codex re-audit packet. Minor → fold into the codex audit packet's known-deferred section, or fix if cheap.

- [ ] **Step 5.4 (conditional): Tightening commit per reviewer**

If Important findings surfaced, land tightening commit(s) per per-platform discipline (web tightening pushed; iOS tightening local). Re-run gates.

---

## F6 — Codex re-audit packet preparation

### Task 6: Generate the new audit packet

**Files:**
- Create: `codex/post-s8-5-audit/codex-2026-05-15-post-s8-5-audit-packet.md`
- Create: `codex/post-s8-5-audit/v1.0.4-since-post-phase-1-codex.diff` (web diff snapshot).

- [ ] **Step 6.1: Create directory**

```bash
mkdir -p /Users/mragile.io/Documents/Claude/Projects/3dprintassistant/codex/post-s8-5-audit
```

- [ ] **Step 6.2: Generate diff snapshots for Codex**

```bash
WEB=/Users/mragile.io/Documents/Claude/Projects/3dprintassistant
git -C "$WEB" diff 9603d37..HEAD -- engine.js scripts/ data/ docs/ai-collab.md \
  > "$WEB/codex/post-s8-5-audit/v1.0.4-since-post-phase-1-codex.diff"
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios diff fc3ee6b..HEAD \
  >> "$WEB/codex/post-s8-5-audit/v1.0.4-since-post-phase-1-codex.diff"
wc -l "$WEB/codex/post-s8-5-audit/v1.0.4-since-post-phase-1-codex.diff"
```

- [ ] **Step 6.3: Author the audit packet**

Write `codex-2026-05-15-post-s8-5-audit-packet.md`. Mirror the prior packet's structure (scope, repos+SHAs, commits-in-scope, per-finding sections, specific challenges, output format). Key sections:

1. **Scope**: this is the second post-Phase-1 Codex audit; the prior audit at `codex/post-phase-1-audit/` flagged 2 Important + 1 Medium + 1 Low. S8.5 addresses all four. **Re-audit scope:** confirm fixes hold + spot-check for new finds.
2. **Repos + SHAs:** web `9603d37..HEAD`, iOS `fc3ee6b..HEAD`.
3. **Per-finding remediation:** F1, F2, F3, F4 with anchors + verification evidence.
4. **Specific things to re-challenge:**
   - F1: Is the overhang fan scaling complete across all 4-5 emission sites? Are there OTHER fan-adjacent fields (e.g., `aux_fan_speed` if any) that should also be env-scaled?
   - F1: `_prov` sidecar updated to flip `source` based on `fanMult` — correct propagation?
   - F2: Codable struct extension safe under all materials (some emit `cooling_fan_min`, some don't)?
   - F2: Are the new fields surfaced anywhere in the iOS UI (read code; if no UI consumer exists, that's a separate concern but not blocker)?
   - F3: MCS coverage breadth now matches web — any gaps remaining?
   - F4: convention placement — is `ai-collab.md` the right home, or is it owned by `3dpa-context.md`'s standing-rules section?
   - Cross-cutting: any of the prior carry-forwards (math duplication 3×, isPETG magic, matrix env-axis sweep, RETIRED_IDS const, mobile-card text-length) now ripe to re-evaluate?
5. **Output format:** Critical / Important / Medium / Low / Observation / Strengths / GO-NO-GO.
6. **Notes:** S9 ship gate is owner-manual TestFlight dispatch — the packet should explicitly state "if you find no Critical or Important, we proceed to S9; if you find any, we tighten before S9."

- [ ] **Step 6.4: Save + verify packet renders cleanly**

```bash
wc -l "$WEB/codex/post-s8-5-audit/codex-2026-05-15-post-s8-5-audit-packet.md"
head -30 "$WEB/codex/post-s8-5-audit/codex-2026-05-15-post-s8-5-audit-packet.md"
```

---

## F7 — Trigger A close

### Task 7: Session log + INDEX + ROADMAP + NEXT-SESSION + push

- [ ] **Step 7.1**: Write session log at `docs/sessions/2026-05-15-cowork-appdev-v1.0.4-s8-5-codex-findings.md`. Structure: Durable context / What happened / Files touched / Commits / Open questions / Memory sweep / Vault sweep / Next session / Self-check.

- [ ] **Step 7.2**: Prepend INDEX bullet for S8.5.

- [ ] **Step 7.3**: Update ROADMAP header date to 2026-05-15; active queue v1.0.4 pointer — "Phase 2.1 closed; S8.5 (Codex post-Phase-1 audit remediation) closed; S9 cold-starts on Phase 2.2 / Task 9 with Codex re-audit pending owner dispatch."

- [ ] **Step 7.4**: Regenerate NEXT-SESSION.md for S9. Same Phase 2.2 mechanics as before, but with a note: **before TestFlight dispatch**, the new Codex audit packet at `codex/post-s8-5-audit/` should be dispatched by owner; if Codex returns clean, proceed to ScreenCaptureUITests → MARKETING_VERSION bump → push → TestFlight.

- [ ] **Step 7.5**: Md-hygiene sweep per 7-point checklist. Memory sweep (likely no new entries — S8.5 patterns are arc-internal). Vault sweep (likely nothing durable).

- [ ] **Step 7.6**: Web close commit + push.

```bash
git add docs/sessions/2026-05-15-cowork-appdev-v1.0.4-s8-5-codex-findings.md \
        docs/sessions/INDEX.md \
        docs/planning/ROADMAP.md \
        docs/sessions/NEXT-SESSION.md \
        docs/superpowers/plans/2026-05-15-s8-5-codex-findings-remediation.md \
        codex/post-s8-5-audit/ && \
git commit -m "docs: wrap S8.5 v1.0.4 Codex findings remediation + new audit packet" && \
git push origin main
```

- [ ] **Step 7.7**: Confirm iOS NOT pushed.

```bash
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios status
git -C /Users/mragile.io/Documents/Claude/Projects/3dprintassistant-ios log --oneline -6
```

iOS local commits expected post-S8.5: `fc3ee6b` + F2 commit + F3 commit (+ optional F2/F3 tightenings). All local-only. **No push.**

---

## Verification gate (complete S8.5)

After F7:
- ✅ Web HEAD post-S8.5 carries overhang fan fix (F1) + breadcrumb convention (F4) + S8.5 docs (F7). Pushed live.
- ✅ iOS HEAD local-only with F2 + F3 commits on top of `fc3ee6b`. No push.
- ✅ All Codex findings (Important #1, Important #2, Medium #1, Low #1) addressed.
- ✅ Internal-reviewer-tightening cycle ran (if applicable).
- ✅ iOS XCTest still 108/108 green (with extended T2a + T12 + T5).
- ✅ Web walkthrough harness green with new overhang assertions.
- ✅ `validate-data 6/6` + `profile-matrix-audit 47196/0 + 55/55 curated` still clean.
- ✅ New Codex audit packet at `codex/post-s8-5-audit/` ready for owner dispatch.

**Owner next move:** dispatch the new Codex packet manually. If clean (or only Observation/Strengths), proceed to S9. If anything Important+, S8.6 tightening cycle.

---

## Stop Conditions / Abort Triggers

1. **F1 walkthrough RED doesn't fire as expected** — engine has already scaled overhang somewhere I missed; investigate before proceeding (use systematic-debugging Phase 1).
2. **F2 Codable decode fails on existing tests** — JSON shape change broke forgiving-Codable rule; pause, surface to owner.
3. **F3 MCS sub-cases can't find exact IDs in web walkthrough** — pause and grep harder, or surface to owner.
4. **More than 5 reviewer Important findings in F5** — pause; pattern is breaking, structural issue likely.
5. **Codex re-audit (F6 output) returns ≥1 Critical** — pause, immediate tightening before S9.

---

## Self-Review (per writing-plans skill)

- **Spec coverage:** all 4 Codex audit findings mapped to F1-F4 tasks. F5 reviewer + F6 packet + F7 close are process steps. Carry-forwards from prior audits (math duplication 3× / isPETG magic / matrix env-axis / RETIRED_IDS const / mobile-card text-length / smoke assertion for emit-vs-claim parity) are not in S8.5 scope per Codex's call ("deferred carry-forwards not blocking ship"). Will surface them again in S9 carry-forward + the new Codex packet's "remaining hygiene" notes.
- **Placeholders:** F3 Task 3.2 has placeholder material/printer IDs that get populated from Step 3.1 inspection — necessary because the web walkthrough's exact data combo isn't reproducible from memory. Step 3.1 is the lookup that closes the placeholders.
- **Type consistency:** `AdvancedFilamentSettings` extension uses `Optional<String>` for fan fields, matching JS emission shape (fan_min_speed is conditional; fan_max_speed always emitted; cooling_fan_overhang is integer string post-F1). Helper signatures verified.
- **API surface verified:** `EngineService.shared.getAdvancedFilamentSettings(state)` returns the extended struct; tests call `advCold.fanMaxSpeed` etc. — matches Swift property naming convention.

---

## Execution Handoff

Execution mode: **Inline** (per superpowers:executing-plans). The 7 remediation-arc skills loaded at session start are still in scope; no re-load needed.

**No subagent-driven-development for this plan** — the surface is per-finding remediation with a clear plan, similar to S7-N + S8. The internal-reviewer subagent dispatch in F5 is the only subagent.
