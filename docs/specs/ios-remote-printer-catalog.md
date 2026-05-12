# iOS Remote Printer Catalog

**Status:** implementation spec for v1.0.3 replacement build or v1.0.4, depending on App Store review timing.

## Goal

Allow iOS to receive missing-printer additions without waiting for a new App Store binary, while keeping the app offline-first and App Review-safe.

## Boundary

Remote updates are **catalog data only**:

- allowed: new printer entries and new brand entries
- not allowed in v1: replacing or correcting bundled printer/brand rows; those require a reviewed App Store binary until an explicit replacement policy and parity gate exist
- not allowed: `engine.js`, formulas, executable rules, feature flags, UI definitions, materials, nozzles, environment rules, objective profiles, troubleshooter data, slicer capabilities

All executable behavior remains bundled in the reviewed app binary.

## Data Flow

1. The app ships with bundled `printers.json`.
2. On launch, Swift loads the bundled catalog as the offline base.
3. Swift validates and loads a previously cached remote overlay when present.
4. Swift merges bundled catalog + valid cached overlay into one resolved launch snapshot.
5. `DataService` and `EngineService` both consume that same immutable launch snapshot.
6. After engine initialization, Swift tries to fetch `https://3dprintassistant.com/catalog/ios-printer-overlay-v1.json` with a short timeout.
7. The fetched overlay is accepted only after schema, compatibility, payload hash, value validation, and bundled-ID collision checks pass.
8. Accepted fetched overlays are written atomically as last-known-good cache for the next launch; they do not mutate the current launch snapshot.

The JavaScript engine never performs network fetches. It receives static JSON from Swift through the existing JavaScriptCore fetch polyfill.

## Overlay Envelope

```json
{
  "schema_version": 1,
  "content_version": 2026051001,
  "min_app_version": "1.0.3",
  "enabled": true,
  "generated_at": "2026-05-10T00:00:00Z",
  "expires_at": null,
  "payload_sha256": "...",
  "payload": {
    "brands": [],
    "printers": []
  }
}
```

`payload_sha256` is the SHA-256 hash of the canonical JSON serialization of `payload`.

## Merge Rules

- Remote brand IDs must be unique within the overlay.
- Remote printer IDs must be unique within the overlay.
- A remote brand with a new ID is appended.
- A remote brand with an existing bundled ID is rejected by both the web-side validator and iOS runtime validator.
- A remote printer with a new ID is appended.
- A remote printer with an existing bundled ID is rejected by both the web-side validator and iOS runtime validator.
- If the overlay is disabled, the app uses bundled catalog only and clears no cache automatically.
- If the overlay is malformed or incompatible, the app keeps the current bundled/cache state.
- Remote printer and brand dictionaries are sanitized through a fixed allowlist before merge. Unsupported fields are not injected into the engine.

## Validation

Reject the overlay before cache write when:

- `schema_version` is unsupported
- `content_version` is missing, non-integer, lower than 1, or greater than `2_099_123_199`
- `min_app_version` is greater than the current app version
- `payload_sha256` does not match `payload`
- required top-level keys are missing
- duplicate brand or printer IDs exist in the remote payload
- a remote brand or printer ID already exists in the bundled catalog
- a brand uses an unsupported `default_slicer`
- a printer uses an unsupported `series`, `enclosure`, or `extruder_type`
- a printer references an unknown manufacturer
- required printer numeric fields are missing, non-numeric, or outside conservative ranges
- `available_nozzle_sizes` is missing or empty

Unknown fields are ignored by the app and rejected by the web-side validation script before deploy. Remote overlays may not include engine-consumed optional fields unless the Swift validator explicitly supports them.

Deploy validation checks bundled-ID collisions against the shipped iOS catalog baseline for `min_app_version`, not against the current web `data/printers.json`. This allows web to bundle a printer immediately while iOS v1.0.3 receives the same printer through the additive remote overlay.

`content_version` follows the `YYYYMMDDXX` scheme and is capped at `2099-12-31-99` (`2_099_123_199`) by both deploy validation and the iOS provider. Values above the ceiling are treated as invalid poisoned-cache defense.

## Promotion From Overlay To Bundled

When a printer or brand shipped through the overlay becomes stable enough to bundle in `data/printers.json`:

1. Add the row to bundled `data/printers.json` in the next iOS binary change.
2. Remove the same row from `catalog/ios-printer-overlay-v1.json`, bump `content_version`, and recompute `payload_sha256`.
3. Run the overlay validator and deploy web before shipping the replacement TestFlight.

Order matters. For a real printer or brand promotion, the bundled binary must ship before the overlay row is removed; otherwise devices still on the older binary can fetch the smaller overlay, cache it, and lose the printer on next launch. Practical rule: do not remove a real overlay row until the bundled binary has been live long enough for normal auto-update uptake. The 2026-05-10 empty-overlay corrective deploy is the narrow exception because build `202605101130` is superseded/TestFlight-only and must not be submitted or used as the release candidate.

If a printer is already in the iOS development branch but not in the public App Store binary, keep it in the remote overlay until the binary that bundles it is actually released. Before adding additional overlay-only printers after that release, publish a higher `content_version` overlay that removes any IDs now bundled by the public binary, or the newer app will reject the whole overlay due to bundled-ID collision.

## Rollback Plan

- **Server rollback:** publish an overlay with `enabled: false` and a higher `content_version`.
- **Bad data rollback:** publish a corrected overlay with a higher `content_version`.
- **Version ceiling:** rollback overlays must keep `content_version` within the `YYYYMMDDXX` ceiling (`2_099_123_199`).
- **App safety:** invalid overlays never overwrite last-known-good cache.
- **Offline fallback:** bundled catalog always remains usable.
- **Cache safety:** last-known-good writes are atomic.
- **Code rollback:** iOS provider changes, web overlay artifact, and docs should land in focused commits so each can be reverted independently.

## App Review Posture

Review notes should say:

> The app includes an offline bundled printer catalog. When online, it may download a validated first-party printer catalog update containing additional printer specifications. This is data only; the app does not download or execute code, and all profile calculations use logic bundled in the reviewed app.

## Verification Gate

Must pass before TestFlight dispatch:

- iOS unit tests for bundled fallback, valid overlay, invalid JSON, hash mismatch, duplicate IDs, unsupported fields, cache fallback, and merged catalog parity.
- Existing `EngineServiceTests` and `OutputViewIntegrationTests`.
- Web overlay validation script.
- Web data validation and walkthrough harness.
- Agent review: senior developer + QA verdict green or explicitly non-blocking yellow.
