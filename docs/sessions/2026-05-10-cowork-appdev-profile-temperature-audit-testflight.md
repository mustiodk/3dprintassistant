# 2026-05-10 - Cowork (appdev): profile temperature audit + TestFlight

## Durable context

- A broad profile audit found one bug family rather than many unrelated bugs: nozzle temperature adjustments could exceed printer hot-end caps and material max ranges after nozzle offset, speed boost, or initial-layer offset.
- The fix is now shipped to web source and iOS TestFlight. Web remains source-of-truth; iOS embeds a byte-identical copy of `engine.js`.
- Latest TestFlight upload is version `1.0.3`, build `202605101130`, from iOS commit `6bd1210`. Workflow run [`25627557344`](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25627557344) succeeded.
- New lightweight test protocol exists at `docs/runbooks/profile-data-change-test-protocol.md`. Keep it hobby-project sized: standard gate by default, optional extra matrix only for risky engine/data fixes, quick UI smoke only for visible output/copy changes.
- Standing owner preference reaffirmed: use the visible progress plan for multi-step work, and push back when a requested action lowers quality or adds low-value process.

## What happened / Actions

1. Owner reported manual phone checks around Bambu P1S/P1P bed caps, H2D speed metadata, X1E chamber metadata, and confusing warning/output behavior.
2. Added `scripts/profile-matrix-audit.js` to run engine-level profile checks across curated phone-like cases plus a broad printer/material/nozzle sweep.
3. Initial broad sweep showed:
   - nozzle output exceeded material max in many adjusted-temperature combinations;
   - nozzle output exceeded printer cap on lower-cap printers;
   - generic open-frame PC warning appeared on enclosed printers;
   - active chamber warnings omitted max chamber capability;
   - printer picker showed raw marketed speed such as `1000 mm/s`.
4. Implemented shared nozzle cap behavior:
   - simple displayed temps clamp to `min(material.nozzle_temp_max, printer.max_nozzle_temp)`;
   - advanced filament temps clamp to the same cap;
   - legacy export and Bambu export inherit the clamped advanced values;
   - warnings now explain printer nozzle cap clamps and material max clamps.
5. Cleaned user-facing warning/metadata copy:
   - enclosed printers no longer receive the generic open-frame PC material warning;
   - active chamber warnings now include printer max chamber temperature;
   - printer picker uses `High-speed` instead of raw `700/800/1000 mm/s`;
   - Creality CFS warning applies to all CFS-capable printers, not only K2 Plus.
6. Added a 15-case independent post-fix matrix after agent review suggested fresh validation cases.
7. Added export-field assertions to the broad audit after senior/QA agents noted the first report collected exports but did not directly assert export temps.
8. Added lightweight future test protocol runbook after owner pushed back on an initially too-heavy process draft.
9. Pushed web/source commit, synced iOS `engine.js` byte-identically, ran iOS tests, pushed iOS commit, and dispatched TestFlight.

## Files touched

**Web repo:**
- `engine.js`
- `scripts/profile-matrix-audit.js`
- `docs/reviews/2026-05-10-profile-matrix-audit.md`
- `docs/reviews/2026-05-10-profile-postfix-validation.md`
- `docs/runbooks/profile-data-change-test-protocol.md`

**iOS repo:**
- `3DPrintAssistant/Engine/engine.js`

## Commits

**Web `3dprintassistant` main:**
- `39a8d0e` - `fix: clamp nozzle temps across profile outputs`

**iOS `3dprintassistant-ios` main:**
- `6bd1210` - `fix: sync nozzle temp clamp engine`

**TestFlight:**
- [`25627557344`](https://github.com/mustiodk/3dprintassistant-ios/actions/runs/25627557344) - succeeded; uploaded version `1.0.3`, build `202605101130`.

## Verification

- `node scripts/validate-data.js` passed.
- Main audit: `55/55` curated scenarios passed; broad sweep `46,512` configurations, `0` failures.
- Independent post-fix audit: `15/15` scenarios passed.
- `node scripts/walkthrough-harness.js` passed.
- Web/iOS `engine.js` byte identity verified with `cmp`.
- iOS unit suite: 85 tests, 0 failures.
- Web UI smoke passed:
  - Bambu high-speed rows show `High-speed`, not raw `1000 mm/s`;
  - X1E + PC warning includes `60°C` chamber max;
  - enclosed PC no longer shows generic open-frame material copy;
  - rendered temperature rows remained intact.
- Senior developer agent review: no push blockers; suggested direct export assertions, which were added.
- QA agent review: no push blockers; suggested UI smoke, which passed.
- TestFlight workflow succeeded and uploaded the binary to App Store Connect.

## User phone test cases for build `202605101130`

1. **X1E chamber copy:** Bambu Lab -> X1E, PC, Standard 0.4. Expected: no generic open-frame PC warning; active chamber detail says X1E supports up to `60°C`.
2. **P2S PC bed boundary:** P2S + PC. Expected: bed clamps to `110°C`; clamp warning, not hard incompatible.
3. **A1 Mini HIPS bed clamp:** A1 Mini + HIPS. Expected: bed clamps to `80°C`; no hard bed-incompatible warning.
4. **Ender-3 V3 PETG fast nozzle cap:** Ender-3 V3 + PETG Basic + Fast. Expected: nozzle clamps to `260°C`; nozzle cap warning appears.
5. **H2D picker metadata:** Bambu printer list. Expected: H2D/H2D Pro/X2D show `High-speed`, not raw `1000 mm/s`.

## Open questions / Follow-up

- **TestFlight processing:** build `202605101130` uploaded successfully, but App Store Connect may need processing time before it appears on device.
- **App Review path:** owner cancelled the previous v1.0.3 review. Current latest TestFlight build is the candidate to test before deciding whether to submit.
- **Remaining v1.0.3-ish lanes:** environments taxonomy and web output-panel UX are still plausible future product work, but do not start unless owner asks.
- **Known non-blocking UX polish:** PC still has a generic `Bed temperature 110°C+` material warning even on printers that can reach it. It is not a correctness failure; consider making it printer-aware later if it annoys during phone testing.

## Memory sweep

No separate memory file added. The durable working rule is captured in the lightweight runbook and in the updated cold-start handoff: keep test protocol practical for a single-person hobby project, and use progress-plan updates consistently.

## Vault sweep

No vault update made. This session used owner-supplied vault data indirectly through prior Bambu work but did not add or edit vault pages.

## Md-hygiene sweep

- No root-level markdown stubs added.
- No secrets added.
- Web and iOS repos were clean after release pushes before session-close docs.
- Session-close docs are expected doc-only follow-up.

## Next session

Recommended first lane: **TestFlight phone verification for build `202605101130`**.

1. Install build `202605101130` once TestFlight processing finishes.
2. Run the five phone test cases above.
3. If green, decide whether to submit this same `1.0.3` build to App Review.
4. If issues appear, fix as one clear finding per platform and repeat the lightweight profile/data gate before another TestFlight build.
