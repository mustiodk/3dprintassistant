# Larger recommendations

Long-form suggestions that don't fit the per-finding template. One per recommendation, titled and scoped.

---

## R1 — Route iOS feedback through `/api/feedback` and retire the direct-post path

**Motivation**
[CRITICAL-001](01-critical.md) — webhook URL is extractable from the iOS binary. Web's Worker path already validates origin, caps size, honeypots, and rebuilds the embed server-side. iOS inherits zero of that.

**Proposed shape**
- iOS `FeedbackService` POSTs to `https://3dprintassistant.com/api/feedback` instead of Discord directly.
- Worker accepts a second path (iOS) gated by an `X-App-Source: ios` header + a short-lived HMAC token. Shared secret stored in Cloudflare env vars (rotatable server-side without shipping a new binary).
- Worker applies existing web-side sanitisation to the iOS submission.
- Rotate the current Discord webhook URL once the Worker path is live.

**Tradeoffs**
- +one round-trip to cloudflare.com for iOS feedback (negligible).
- +one endpoint surface to maintain on the Worker.
- −no more binary-extractable webhook, −rotation now means "change an env var" not "ship an App Store update".

**Alternatives considered**
- Keep direct-post but add `@everyone` stripping + a client secret → doesn't solve the DOS vector because the URL is still in the binary.
- Use Discord OAuth → vastly overengineered for anonymous feedback.

**Effort:** small (< 1 day).

---

## R2 — Bridge the engine's `SLICER_TABS` / `SLICER_PARAM_LABELS` into iOS; delete `SlicerLayout.swift`

**Motivation**
[HIGH-006](02-high.md). The engine already owns the data; iOS re-encodes it. Every engine-side structural change to slicer output needs a hand-port.

**Proposed shape**
- Add `Engine.getSlicerTabs(slicer)` and `Engine.getSlicerParamLabels(slicer)` as exported functions returning JSON-friendly shapes (the current constants are already JSON-friendly — just expose them).
- Add `EngineService.getSlicerTabs(for: String) -> [SlicerTab]` bridge.
- Delete `3DPrintAssistant/Models/SlicerLayout.swift`'s static data. Keep the `SlicerTab` / `SlicerLayout` struct as the Swift-side shape the view consumes.
- Add an XCTest that serialises `getSlicerTabs` for all three slicers and diffs against a stored JSON fixture — any engine-side change breaks the test until the fixture is regenerated.

**Tradeoffs**
- +one more JSCore call on screen load (can be cached at EngineService init).
- +maintenance of a fixture JSON for the snapshot test.
- −silent drift surface eliminated.

**Alternatives considered**
- Code-gen a Swift file from the JS at build time → works but adds a build step (the project currently has no JS build step; introducing one is a non-trivial ops change).

**Effort:** small (< 1 day).

---

## R3 — Tighten the IMPL-040 test suite: exact-count + hardcoded-value tier

**Motivation**
[HIGH-002](02-high.md), [MEDIUM-011](03-medium.md), [HIGH-011](02-high.md). The current tests would pass through a catastrophic regression of the invariant they guard.

**Proposed shape**
Two tiers of test:

- **Tier A — parity (tightened existing test):**
  - Compute `expectedCount = combos.count * surfaces.count` at setup.
  - Replace every `continue` in the loop with `XCTFail(...)`.
  - End with `XCTAssertEqual(checked, expectedCount)`.
  - Have the engine return a structured `emittedValue: Double` field alongside `desc`; assert on the field directly. Keep the regex assertion as a sanity layer.

- **Tier B — correctness (new test):**
  - 8-10 hardcoded `(printer, nozzle, surface, expected_layer_height)` tuples covering: an Ultra clamp-up case (x1c + 0.6mm + Ultra → 0.12), a Draft clamp-down case (a1mini + 0.4mm + Draft → 0.28), a no-clamp case, a tight-firmware printer, a CoreXY case, a bedslinger case.
  - Assert `chipNum == emittedNum == expected` for each.

**Tradeoffs**
- Tier B requires manual test-data maintenance when the formula constants change. That's the point — the test becomes the documentation of the formula's outputs.

**Alternatives considered**
- Property-based test with random printer/nozzle — too noisy, doesn't catch the specific clamp-drop class.

**Effort:** small.

---

## R4 — Replace the `actor`-based `EngineService` with a dedicated serial executor

**Motivation**
[HIGH-003](02-high.md). Actor isolation ≠ single-thread affinity. JSCore documents single-thread affinity as a requirement. The current code relies on empirical luck under low traffic.

**Proposed shape**
- Convert `EngineService` to a `final class` with an internal `private let queue = DispatchQueue(label: "engine.js", qos: .userInitiated)`.
- Every public async method becomes `func foo(...) async throws -> T { try await withCheckedThrowingContinuation { cont in queue.async { do { let r = try self.sync_foo(...); cont.resume(returning: r) } catch { cont.resume(throwing: error) } } } }`.
- Private `sync_foo` methods do the JSContext work — guaranteed on the single serial queue's thread.

**Tradeoffs**
- −`async`-native code is slightly more verbose.
- +genuine single-thread pin that the runtime can't undo.
- +every JSContext access becomes grep-able to one file.

**Alternatives considered**
- Custom executor conforming to `SerialExecutor` pinned to a thread → works, more complex, requires iOS 17+ (already the minimum, so OK). Still recommend queue-based for simplicity.

**Effort:** small.

---

## R5 — Consolidate retraction naming: pick `retraction_distance`, delete `retraction_length`

**Motivation**
[HIGH-001](02-high.md) + [LOW-003](04-low.md). Two names for the same concept drives the export-vs-emission drift bug. Even after fixing that bug, the naming is an ongoing footgun.

**Proposed shape**
- Rename every `retraction_length` in `materials.json` to `retraction_distance`.
- Update every engine read site.
- Compute the scaled value once in `resolveProfile` and thread it through `getAdvancedFilamentSettings` and `exportBambuStudioJSON` from the resolved profile, not from raw material data.
- Add engine init-time validation: assert every material has `retraction_distance` and a valid numeric value.

**Tradeoffs**
- Data-layer rename is a one-shot migration; no legacy readers outside this codebase.

**Effort:** small (engine) + trivial (data).

---

## R6 — Add IP-bucket rate limiting to `/api/feedback` and strip `@everyone`/`@here`

**Motivation**
[HIGH-010](02-high.md). Origin-only validation is trivially bypassed server-to-server. Without rate limiting, the endpoint is an open Discord relay.

**Proposed shape**
- Durable Object or Workers KV bucket: 10 req/min per IP, 100 req/min global. Reject with 429 above either.
- In `feedback.js`, run every user-supplied string (`label`, `value`) through a sanitiser that:
  - Replaces `@everyone` / `@here` with `@\u200Beveryone` / `@\u200Bhere` (zero-width-space defuses Discord mention parsing without losing semantics).
  - Strips `[text](url)` markdown link syntax (prevent phishing embeds).
  - Escapes backticks that wrap URLs (defuse auto-preview).
- Log rejected requests to Cloudflare Analytics for visibility.

**Tradeoffs**
- +a small amount of Workers code, +a KV binding or Durable Object.
- −trivial open-relay attack surface.

**Effort:** small.

---

## R7 — Structured emission: add a typed Codable contract for `resolveProfile` output

**Motivation**
[MEDIUM-009](03-medium.md). The current `[String: [String: Any]]` decode silently drops unknown fields and stringifies-Optional values via interpolation. Future engine additions (meta fields, new value types) will silently be lost.

**Proposed shape**
```swift
struct EngineProfile: Codable {
    let version: String?         // optional meta
    let params: [String: Param]
    struct Param: Codable {
        let value: String        // always string in current contract; widen if needed
        let why: String
        let mode: Mode?
    }
    enum Mode: String, Codable { case simple, advanced }
}
```
Engine returns `{ "version": "1", "params": { "layer_height": { ... } } }` (requires a small JS-side wrapper at the `return` block). iOS decodes via `JSONDecoder`.

**Tradeoffs**
- Requires a contract version for the engine's own output, which is a useful decoupling for future changes.
- Slight engine-side wrapper cost.

**Effort:** medium (1–3 days) — touches engine, iOS decoder, and every test that reads profile output.

---

## R8 — Introduce init-time schema validation in the engine

**Motivation**
[MEDIUM-001](03-medium.md), [MEDIUM-007](03-medium.md), [MEDIUM-018](03-medium.md), [MEDIUM-019](03-medium.md), [HIGH-009](03-medium.md). Many of the findings are data-integrity issues the engine doesn't surface. A small validation pass at `init()` time catches:

- Every `printer.series` ∈ known set.
- Every `limits_override.nozzles` key parses as finite number.
- Every material has both `retraction_distance` and `base_settings.*` required fields.
- Every `nozzles.json.*.not_suitable_for` ID resolves to a material.
- Every `max_mvs` key set matches `k_factor_matrix` key set.
- Every `objective_profiles.*.desc` is purely qualitative (no embedded numbers).

**Proposed shape**
A new `_validateSchema()` that runs after data is loaded and throws an `EngineError` with a list of issues. Dev-mode shows them in-UI; production-mode throws to crash the engine (fail-loud). CI runs `_validateSchema()` standalone against every PR that touches data files.

**Tradeoffs**
- +one-time cost to write the validators.
- +every class of silent data-drift becomes a loud boot error.
- −small (<50ms) added to init time.

**Effort:** medium.
