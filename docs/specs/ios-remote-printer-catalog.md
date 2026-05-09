# iOS Remote Printer Catalog

**Status:** implementation spec for v1.0.3 replacement build or v1.0.4, depending on App Store review timing.

## Goal

Allow iOS to receive missing-printer additions and factual printer corrections without waiting for a new App Store binary, while keeping the app offline-first and App Review-safe.

## Boundary

Remote updates are **catalog data only**:

- allowed: printer entries, brand entries, factual corrections to printer specs
- not allowed: `engine.js`, formulas, executable rules, feature flags, UI definitions, materials, nozzles, environment rules, objective profiles, troubleshooter data, slicer capabilities

All executable behavior remains bundled in the reviewed app binary.

## Data Flow

1. The app ships with bundled `printers.json`.
2. On launch, Swift loads the bundled catalog as the offline base.
3. Swift loads a previously validated remote overlay from local storage when present.
4. Swift tries to fetch `https://3dprintassistant.com/catalog/ios-printer-overlay-v1.json` with a short timeout.
5. The fetched overlay is accepted only after schema, compatibility, payload hash, and value validation pass.
6. Accepted overlays are written atomically as last-known-good cache.
7. Swift merges bundled catalog + accepted overlay into one resolved `printers.json`.
8. `DataService` and `EngineService` both consume that same merged catalog.

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
- A remote brand with an existing ID replaces the bundled brand.
- A remote printer with a new ID is appended.
- A remote printer with an existing ID replaces the bundled printer.
- If the overlay is disabled, the app uses bundled catalog only and clears no cache automatically.
- If the overlay is malformed or incompatible, the app keeps the current bundled/cache state.
- Remote printer and brand dictionaries are sanitized through a fixed allowlist before merge. Unsupported fields are not injected into the engine.

## Validation

Reject the overlay before cache write when:

- `schema_version` is unsupported
- `min_app_version` is greater than the current app version
- `payload_sha256` does not match `payload`
- required top-level keys are missing
- duplicate brand or printer IDs exist in the remote payload
- a brand uses an unsupported `default_slicer`
- a printer uses an unsupported `series`, `enclosure`, or `extruder_type`
- a printer references an unknown manufacturer
- required printer numeric fields are missing, non-numeric, or outside conservative ranges
- `available_nozzle_sizes` is missing or empty

Unknown fields are ignored by the app and rejected by the web-side validation script before deploy. Remote overlays may not include engine-consumed optional fields unless the Swift validator explicitly supports them.

## Rollback Plan

- **Server rollback:** publish an overlay with `enabled: false` and a higher `content_version`.
- **Bad data rollback:** publish a corrected overlay with a higher `content_version`.
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
