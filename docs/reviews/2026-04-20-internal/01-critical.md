# CRITICAL findings

Three findings at this severity. CRITICAL-001 from the initial review. CRITICAL-002 and CRITICAL-003 added 2026-04-20 from the Phase 1 domain walkthrough (see [domain-walkthrough.md](domain-walkthrough.md) for raw evidence).

---

### [CRITICAL-001] iOS feedback POSTs directly to Discord webhook URL embedded in the binary

**Platform:** iOS
**Files:** `3DPrintAssistant/Services/FeedbackService.swift:111-138`, `3DPrintAssistant/Utils/AppConstants.swift` (reads from `Info.plist`), build config `Config.xcconfig` (gitignored) → `Info.plist`
**Commit:** 24aef66 (iOS)

**Summary**
The iOS app posts feedback directly to Discord, bypassing the `/api/feedback` Cloudflare Worker that the web app funnels through. The Worker validates `Origin`, caps body size, runs a honeypot, and rebuilds the embed server-side. The iOS app does none of that: it reads the webhook URL from `Info.plist` (injected from `Config.xcconfig` at build time), builds the Discord embed client-side, and `URLSession`-POSTs straight to `discord.com/api/webhooks/...`. The URL is trivially extractable from the shipped `.ipa` via `strings`. No authentication gate, no rate limit, no content sanitisation — any string the user types is forwarded as-is into embed fields.

**Evidence**
```swift
// FeedbackService.swift:111-138
func submit(_ submission: FeedbackSubmission) async throws {
    guard let url = AppConstants.feedbackWebhookURL else {
        throw FeedbackError.webhookNotConfigured
    }
    var request = URLRequest(url: url)              // discord.com/api/webhooks/...
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONSerialization.data(
        withJSONObject: submission.discordPayload(), options: [])
    // no auth, no sanitisation, no rate limit
    (data, response) = try await session.data(for: request)
}
```

`discordPayload()` at `FeedbackService.swift:72-97` assembles `embeds[*].fields[*].value` from raw user input with only `String(value.prefix(1000))` as the cap — nothing strips `@everyone`, `@here`, Discord markdown link syntax, or user-supplied `mailto:` URLs in the reply-to field.

**Impact**
- **Denial of feedback:** an attacker hits the endpoint repeatedly, burns the webhook's 30 req/min rate bucket, and real users' feedback starts failing silently. Webhooks are per-channel; once rate-limited the channel goes quiet.
- **Spoofed feedback:** attacker sends fake "bug reports" with `@everyone` pings, phishing links, or content mimicking legitimate users. Because the embed is built client-side, every field is attacker-controlled.
- **Remediation is expensive:** rotating the webhook requires an App Store submission + review + user updates. Every still-installed old binary keeps the dead URL reachable.

**Recommendation**
Route iOS through the same `/api/feedback` Cloudflare Worker the web already uses. The minimum viable change:

1. In iOS `FeedbackService`, change the POST target from the Discord webhook URL to `https://3dprintassistant.com/api/feedback`.
2. Extend the Worker (`functions/api/feedback.js`) to accept iOS submissions. Today it rejects based on `Origin`; add a secondary path that accepts a requests carrying an `X-App-Source: ios` header and a short signed token (HMAC of `bundle_id + build_date` using a secret stored in Cloudflare env vars — or even just a static shared secret for v1, rotatable without a binary update because the Worker owns the other side).
3. In the Worker, apply the same server-side sanitisation already used for web: strip `@everyone`/`@here`, rebuild the embed from validated fields, cap sizes.
4. Rotate the existing Discord webhook URL after the Worker route is live; the new webhook URL is known only to the Worker, never shipped in a binary.
5. Ship as v1.0.2.

Until the rotation lands, the leak is already in v1.0.0 + v1.0.1. Consider adding a minimal fast mitigation this week: have the current iOS build still POST direct but with a `User-Agent` check on the Discord side via a Cloudflare rule in front — not possible since Discord is a third party, so the Worker route is genuinely the only fix.

**Effort estimate:** small (< 1 day) — the Worker already exists, the iOS client change is a one-line URL swap + header add, and the shared-secret auth is ~30 lines of Worker code.

---

### [CRITICAL-002] Emitted bed temperatures exceed `printer.max_bed_temp` on real combos — no printer-specific warning or clamp

**Platform:** both (engine), impacts live users
**Files:** `engine.js` (`resolveProfile` emission path for `initial_layer_bed_temp` / `other_layers_bed_temp` via `getAdvancedFilamentSettings`), `data/rules/warnings.json`
**Observed in:** Combo 6 (A1 + ABS) and Combo 10 (K1 Max + PC) of [domain-walkthrough.md](domain-walkthrough.md)
**Commit:** c4c5071

**Summary**
The engine emits a bed-temperature recommendation that the user's printer physically cannot reach. Two confirmed combos in the Phase 1 walkthrough:

| Combo | Printer max_bed_temp | Emitted initial bed | Emitted other bed |
|---|---|---|---|
| A1 + ABS | **100°C** | **105°C** ❌ | 100°C |
| K1 Max + PC | **100°C** | **115°C** ❌ | **110°C** ❌ |

The PC case fires a generic warning `[mat_pc_1]`: _"Bed temperature 110°C+: ensure your printer's bed can reach and sustain this temperature."_ — but this warning is material-driven, not printer-aware. It fires for any PC selection regardless of printer, and does not tell the user "your printer cannot reach this temperature." The ABS case fires no bed-temp warning at all — only the enclosure warnings.

The engine clamps nozzle speed via `_clampNum(..., printer.max_speed)` and catches nozzle-temp overshoots via `printer_max_nozzle_temp` warning, but there is no symmetric `printer_max_bed_temp` check or clamp.

**Evidence**
From `domain-walkthrough.md` Combo 10, Advanced filament settings:
```
| initial_layer_bed_temp | 115 °C |
| other_layers_bed_temp  | 110 °C |
```
Printer caps: `K1 Max.max_bed_temp = 100`.
Warnings fired: `mat_pc_0` (enclosure), `mat_pc_1` (generic temp notice), `pei_adhesion`. **None mention the printer's 100°C ceiling.**

**Impact**
For a live product: the user loads the displayed profile, sets bed to 110°C on a K1 Max, the bed never reaches that temperature (heats to ~95–100°C and stops), the print fails with warping/layer separation, and the user has no signal that the recommendation was impossible.

Same pattern for A1 + ABS: 105°C initial layer on an A1 with 100°C bed max. PLUS the A1 is open-frame and the engine is already warning enclosure-required — the user is told "don't print ABS on this printer" AND given an impossible bed temp. Mixed messaging.

This is the symmetric twin of the nozzle-temp check that the engine gets right. **Top live-product risk** surfaced by the domain walkthrough.

**Recommendation**
In `resolveProfile` (or `getAdvancedFilamentSettings`), clamp `initial_layer_bed_temp` and `other_layers_bed_temp` to `min(material.bed_temp_max, printer.max_bed_temp)` — mirroring the nozzle-temp treatment. When the clamp fires, add a structured warning `printer_max_bed_temp_clamped` with printer-specific text (`"K1 Max bed capped at 100°C — PC typically needs 110°C. Prints may warp or fail layer adhesion."`).

If a printer literally cannot reach a material's minimum required bed temp (`printer.max_bed_temp < material.bed_temp_min`), escalate to a hard incompatibility warning in the same class as `enclosure_required`.

**Effort estimate:** small (< 1 day)

---

### [CRITICAL-003] Silent fallback when state carries unknown preset ID — `outer_wall_speed` emitted undefined with no warning

**Platform:** both (engine)
**Files:** `engine.js` (speed preset lookup inside `resolveProfile`)
**Commit:** c4c5071

**Summary**
If `state.speed` (or `state.strength`, `state.surface`) contains an ID that isn't in the valid preset set, the engine silently emits `undefined` for dependent simple-mode params. Demonstrated:

```
state.speed = "nonsense"
→ outer_wall_speed.value = undefined
→ inner_wall_speed.value = undefined
→ warnings: [ "pla_heat_creep" ]  (nothing about the invalid preset)
```

The valid speed IDs are `fast | balanced | quality`. Any other value — including legacy IDs from an older client, a typo in URL-sharing payload, or an A/B test name — silently drops speeds to undefined. The UI then renders empty cells; `exportBambuStudioJSON` (disabled, but latent) would emit literal `"undefined"` strings; `calcPrintTime` would hit its speed fallback path.

This is the same class as [HIGH-009] (`_clampNum` returns unchanged for non-finite input) — the engine fails open silently instead of either clamping to a default or raising a warning.

**Impact**
Live users with a corrupted localStorage preset, or with a shareable-URL link to an old preset format (on the roadmap per `app.js:75`), would see a broken profile with no indication of why. Silent partial output is worse than either a clear error or a visible default fallback.

**Recommendation**
Two-step fix:
1. In `resolveProfile`, validate every `state.<preset>` against its valid-items set at function entry. If invalid, either (a) coerce to the default preset and emit a `warning` with ID `invalid_preset` — preferred, or (b) throw an error.
2. Add init-time validation (per [R8] in `07-recommendations.md`) that asserts profile output has no simple-mode `undefined` values for any combination of valid preset IDs — CI-enforced.

The walkthrough harness already has this check — port the logic into engine self-test in dev builds.

**Effort estimate:** small (< 1 day)
