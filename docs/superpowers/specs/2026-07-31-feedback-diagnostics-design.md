# Feedback Diagnostics v2 — design

**Date:** 2026-07-31
**Status:** Owner-approved 2026-07-31 — implementation authorized
**Scope:** 3dprintassistant web + iOS + the existing Cloudflare Worker
**Owner goal:** Automatically capture the highest-value diagnostic context with every bug report, without turning feedback into a complex support platform.

## 1. Decision summary

Replace the current “free text plus device footer” bug-report payload with one
strictly allowlisted `feedback_v2` report shared by web and iOS.

Each submitted bug report contains:

1. user-authored report content;
2. a frozen diagnostic snapshot from the failure or report-open moment;
3. up to 25 privacy-safe in-memory breadcrumbs;
4. a server-generated report id and issue fingerprint.

The Worker stores the report in a dedicated EU D1 database for at most 90 days,
sends a minimized pseudonymous alert to the existing Discord feedback channel,
and exposes the full report through a small authenticated Feedback section in
the existing `/analytics` owner page.

This is deliberately **not** a general telemetry system, customer-support
platform, account feature, or remote logging service.

## 2. Problem and current evidence

The current feedback path cannot answer the questions needed to triage a bug:

- Which physical printer was used?
- Which printer profile, material, nozzle, slicer and output mode were active?
- Was the printer present in the bundled or remote catalog seen by the user?
- Which screen and operation failed?
- What happened immediately before the failure?
- Is the report from an old, TestFlight, App Store or web release?
- Is there an existing Sentry event for the same failure?

The data already exists in separate places but is not joined to the report:

- web `app.js` and iOS `AppState` hold the current configuration;
- product analytics receives a subset of the selection ids but is intentionally
  anonymous and cannot be correlated with a report;
- Sentry captures iOS crashes and selected engine errors but has no report id;
- `/api/feedback` sends the report to Discord and retains only printer-intake
  candidates, not ordinary bug reports;
- web feedback currently reports the hard-coded app version `1.0`.

Therefore the report itself must carry its own bounded diagnostic context.

## 3. Scope cap

### In scope

- Bug reports on web and iOS.
- Backward-compatible handling of already-released legacy clients.
- One shared schema and validation contract.
- Local-only breadcrumb capture, transmitted only when a report is submitted.
- A locally saved physical-printer preference.
- One D1 report table, one authenticated admin API surface and one existing
  owner-page section.
- Edge rate limiting that uses the request IP only as a transient rate-limit
  key and never writes it into the report or application logs.
- Minimized Discord notification.
- Privacy policy and App Store privacy-answer audit.
- Tests, migration, local D1 integration and synthetic production canaries.

### Out of scope

- Accounts, login, cross-device identity or a persistent user/session/device id.
- A standalone support dashboard or ticketing product.
- Automatic GitHub issue creation.
- Full logs, arbitrary state dumps, generated slicer output or Workshop data.
- Screenshots, attachments or screen recording.
- Product analytics expansion.
- New web error-monitoring vendor.
- Android implementation. The schema reserves `android` as a future source,
  but the missing local checkout and separate Android gate remain untouched.

## 4. Architecture

```text
Web/iOS
  DiagnosticRecorder (RAM only, max 25 breadcrumbs)
       + current/frozen DiagnosticSnapshot
       + user report fields
                    |
                    v
             POST /api/feedback
                    |
          validate + normalize v1/v2
          generate RPT id + fingerprint
          encrypt user-content block
                    |
          +---------+----------+
          |                    |
          v                    v
    FEEDBACK_DB (truth)   Discord minimized alert
          |
          v
    existing /analytics owner page
    Feedback list + detail + disposition + delete
```

### 4.1 Client recorder

Web and iOS each implement a small `DiagnosticRecorder` with the same contract.
It owns:

- a fixed-capacity, in-memory ring buffer of 25 allowlisted breadcrumbs;
- the most recent frozen failure snapshot;
- a current snapshot builder for manual reports.

Nothing in the recorder is persisted or transmitted by itself. It is cleared
when the page/app process ends. Submission is the only network boundary.

Known error paths freeze a snapshot when the error occurs. Their “Report issue”
entry point uses that frozen snapshot even if the user navigates later. A generic
bug-report entry point snapshots current state when the form opens.

### 4.2 Worker and persistence

The existing Worker remains the only public feedback endpoint.

For every accepted report it:

1. authenticates the caller using the existing web-origin or native-HMAC path;
2. validates an exact schema and rejects unknown keys;
3. normalizes legacy and v2 payloads;
4. generates a random `RPT-` id with at least 80 bits of entropy;
5. derives an issue fingerprint from stable failure facts, never identity facts;
6. encrypts the complete user-content block with AES-GCM;
7. stores one D1 row;
8. posts the minimized Discord alert;
9. returns `{ ok: true, reportId }`.

The request limit becomes 32 KiB for v2 while every nested field keeps its own
smaller bound. A dedicated Cloudflare rate-limit binding rejects bursts before
JSON parsing/D1 work (initial policy: five accepted attempts per source IP per
minute). Cloudflare necessarily processes the request IP at the edge, but the
application does not retain or expose it.

If D1 storage fails, the request fails and Discord is not posted. D1 is the
authoritative record; a Discord-only success must not be presented as a saved
report. If D1 succeeds but Discord fails, the report remains saved and the
response succeeds with `notified: false`; Discord delivery is best-effort.

Legacy clients remain accepted. They are stored as `feedback_legacy_v1` with
`diagnostic_completeness = "partial"`; no missing fields are invented.

Before encryption/storage, both payload versions normalize into the same
category-specific server model. For `generalFeedback`, `featureRequest` and
`bugReport`, the existing printer-mention extractor receives canonical
`[{ id, value }]` fields derived from either legacy `fields` or v2
`userContent`. The current form/heuristic intake lanes, bounded matched-span
storage, TTLs and fail-open relationship to feedback delivery remain intact.
Tests must prove a printer request in a v2 bug report still reaches the
heuristic intake lane and non-printer reports do not.

### 4.3 Owner surface

Add one Feedback section to the existing `/analytics` owner page and reuse its
existing owner-token flow. Do not build a second application or login system.

The section provides only:

- newest-first list with report id, date, platform/version, category,
  disposition,
  physical/selected printer and error code;
- report detail with decrypted user content, diagnostics and breadcrumbs;
- issue-fingerprint matches;
- disposition update;
- immediate deletion.

No charts, assignments, comments, SLA logic, outbound email UI or automation.

## 5. Feedback v2 contract

The client sends stable ids rather than localized labels.

```json
{
  "schemaVersion": "feedback_v2",
  "category": "bugReport",
  "userContent": {
    "whatHappened": "Export failed after tapping Orca bundle",
    "expected": "A bundle should be created",
    "steps": "Generate profile, open Export, tap Orca bundle",
    "email": "optional@example.com"
  },
  "diagnostics": {
    "capturedAt": "2026-07-31T12:34:56Z",
    "captureReason": "export_failed",
    "entryPoint": "output.export_error",
    "application": {},
    "physicalPrinter": {},
    "configuration": {},
    "catalog": {},
    "runtime": {},
    "failure": {},
    "breadcrumbs": []
  }
}
```

### 5.1 Application and release

Collect automatically:

- `platform`: `web` or `ios`;
- `releaseChannel`: `production`, `preview`, `local`, `debug`,
  `sandbox_or_testflight` or `appstore`;
- `appVersion` and native `buildNumber`;
- `releaseId`: deployed web revision or native bundled revision when available;
- `engineRevision`: build-generated engine hash/revision, not a runtime file dump;
- OS/browser family and version, device model class, locale and screen class.

Fix the hard-coded web version as part of this feature. A checked-in,
machine-generated `release-manifest.js`, loaded before `app.js` and
`feedback-form.js`, exposes one immutable web `releaseId`, version label and
asset fingerprint to both feedback and analytics. A small generator hashes the
diagnostic-relevant runtime assets and rewrites the manifest; its `--check`
mode fails whenever those assets changed without regenerating the manifest.
Wire `--check` into the normal web verification command. This preserves the
current no-build static deployment while making a stale release id a failing
gate instead of a manual convention.

`releaseChannel` is validated by platform: web accepts only
`production|preview|local`; iOS accepts only
`debug|sandbox_or_testflight|appstore`.

### 5.2 Physical printer

The app cannot infer the real printer from the selected profile. Add a local
“My printer” preference:

- supported printer: stable catalog printer id;
- unsupported printer: bounded custom brand + model;
- `unknown` when the user has not supplied one.

It is stored only on the device/browser and the privacy policy says so. The
first printer-related bug report
with no value asks once and offers to remember it locally. It is not required
for UI-only bugs and never creates an account.

The submitted report distinguishes:

- `physicalPrinter`: what the user says they own/use;
- `configuration.printer`: the profile selected in 3D Print Assistant;
- `match`: `same`, `different`, `unknown` or `custom_not_in_catalog`.

Custom brand/model values join the encrypted user-content block. Plaintext
diagnostics and Discord carry only `custom_not_in_catalog`, never the custom
text.

### 5.3 Configuration snapshot

Collect stable ids already present in app state:

- brand, printer, nozzle and material;
- use case, surface, strength, speed, environment, support and colors;
- user level and special options;
- seam, brim, build plate, extruder type, filament condition and ironing;
- profile mode, output mode and resolved slicer;
- active view/tab and requested export type when applicable;
- native-export availability and fallback reason when applicable.

Do not collect generated parameter values or exported file contents. The input
state is enough to reproduce output through the versioned engine.

### 5.4 Catalog and runtime

Collect:

- bundled printer-catalog baseline/revision;
- remote overlay source and `content_version`;
- whether the selected printer resolved in the active catalog;
- engine initialization state;
- online/offline state;
- only the status class/code of a directly relevant failed request;
- whether a documented fallback was used.

Do not collect IP address, request headers, full URLs, query strings, local file
paths, response bodies or general network logs.

### 5.5 Failure and Sentry

Known failure paths emit a stable, bounded error record:

- `code`, `subsystem`, `operation` and `safeMessage`;
- existing Sentry event id when one was already created;
- no new Sentry event for a generic manual report;
- no stack trace in feedback—the event id is the bridge to Sentry.

Raw localized error descriptions may contain paths or unexpected content and
must not be copied automatically. Each instrumented path chooses its own safe
message and error code.

### 5.6 Breadcrumbs

Each breadcrumb has only:

- an allowlisted event name;
- milliseconds relative to snapshot capture;
- screen/feature id;
- a small map of allowlisted closed-vocabulary ids.

Initial event set:

- app/page opened;
- screen opened;
- printer/material/nozzle selected;
- profile generated;
- output tab opened;
- export/copy started, succeeded or failed;
- catalog initialized or failed;
- feedback opened.

No text input, custom names, URLs, file names, profile output or values from
outside this explicit list enter the ring buffer.

## 6. Storage model

Use a dedicated EU-jurisdiction D1 binding named `FEEDBACK_DB` and one table,
`feedback_reports`.

The row contains:

- report id, schema version, category, source and timestamps;
- one `disposition`: `new`, `needs_info`, `actionable`, `fixed`, `duplicate`,
  `unsupported`, `not_reproducible` or `closed_other`;
- app/release summary columns needed by the list view;
- encrypted `user_content` JSON + IV;
- plaintext allowlisted `diagnostics_json` and `breadcrumbs_json`;
- issue fingerprint;
- `expires_at` fixed to no later than 90 days after receipt.

One AES-GCM key (`FEEDBACK_DATA_KEY`) protects the user-content block, with the
report id + schema version bound as authenticated additional data. Encryption
is a security control, not anonymization; the report remains personal data.
There is no versioned keyring. If this disposable 90-day store ever needs an
emergency key rotation, delete the active rows first and rotate the secret;
preserving old support reports is less important than keeping the system small.

The existing daily Worker cron extends its retention task to delete expired
feedback rows. Manual deletion removes the row immediately. There are no report
backups outside Cloudflare's normal service-level storage.

## 7. GDPR and privacy boundary

Treat every persisted report as personal data even when most technical fields
are not identifying on their own.

Purposes:

- diagnose, reproduce and resolve user-reported product defects;
- contact the reporter only when they voluntarily provide an email address.

Required controls:

- document the selected Article 6 basis before implementation; the intended
  design is legitimate interests for necessary diagnostics and voluntary,
  specific consent for reply email;
- complete a short legitimate-interest assessment;
- update the privacy policy with controller/contact, data categories, purpose,
  recipients/processors, retention, rights and complaint route;
- correct the current policy's missing disclosure of the existing feedback
  relay and optional email before claiming the v2 policy is complete;
- audit App Store privacy answers before the iOS release;
- provide an inline plain-language disclosure next to Submit;
- provide access/deletion by report id and, when supplied, email;
- document Cloudflare, Sentry and Discord roles/transfer terms;
- explain that a linked Sentry event id connects two records about the same
  reported incident;
- never intentionally collect Article 9 special-category data.

The form warns users not to include personal or sensitive information in free
text. Free text can nevertheless contain it, which is why it is encrypted,
excluded from Discord and deletable.

Discord receives only a minimized pseudonymous alert:

- report id;
- category, platform, app version/build and release channel;
- physical/selected printer classification;
- stable error code/operation;
- issue fingerprint;
- link/instruction for opening the private owner view.

It receives no email, user-authored text, breadcrumbs, Sentry id or full
diagnostic JSON. The report id is still pseudonymous personal data and Discord
must remain disclosed as a recipient; “minimized” does not mean GDPR-exempt.

## 8. User experience

Keep the existing feedback surface and category taxonomy.

For `bugReport` only:

- `What happened?` required;
- `What did you expect?` optional;
- `Steps to reproduce` optional;
- physical-printer confirmation only when relevant and not already known;
- compact, expandable “Technical diagnostics included” summary;
- optional email with the existing stay-anonymous explanation;
- warning not to include personal or sensitive information;
- success state shows the returned report id.

Diagnostics are a disclosed fixed part of submitting a bug report. General
feedback and feature requests receive only minimal application/release context,
not breadcrumbs or full configuration.

## 9. Issue fingerprint and triage

The fingerprint groups likely duplicates; it never closes or merges them
automatically.

Use only stable diagnostic facts that exist for the report, such as:

- error code + subsystem + operation;
- platform;
- selected printer id and slicer/export type when relevant.

Exclude report id, email, user text, timestamp, device model, locale and IP. App
version remains a filter rather than part of the fingerprint so the owner can
see the same failure across releases.

The owner process stays small:

1. Discord announces the report.
2. Open the report in the existing owner page; fingerprint matches are queried
   on demand, never counted synchronously on the submission path.
3. Check version, physical/selected printer, matches, frozen state,
   breadcrumbs and Sentry link.
4. Set disposition; create a GitHub issue manually only when actionable.
5. Delete immediately when inappropriate or no longer needed; otherwise cron
   removes it at 90 days.

## 10. Error handling

- Invalid/oversized reports return a stable 4xx code and are not stored/notified.
- D1 failure returns a retryable 5xx; the client retains form content in memory.
- Discord failure does not lose an already stored report. This intentionally
  reverses today's Discord-authoritative semantics: `{ ok: true,
  notified: false }` means “saved for owner review, alert delayed/missing.”
- Admin decryption failure shows metadata plus `user_content_unavailable`; it
  never returns ciphertext as if it were readable content.
- Unknown v2 keys fail closed so accidental state expansion cannot silently
  increase collection.
- Legacy payload handling remains narrowly compatible and cannot smuggle new
  unvalidated diagnostic fields.

## 11. Delivery sequence

### Gate A — backend dark launch

- Add migration, D1 binding, rate limiting, encryption/retention helpers and
  admin API.
- Add `feedback_v2` validation while retaining legacy compatibility.
- Preserve both Printer Intake tee lanes through the normalized server model.
- Keep current clients unchanged.
- Provision with the explicit EU-jurisdiction option only after source/config
  paths are proven private. Before migration, record `wrangler d1 info` output
  that independently reports EU jurisdiction; the database id alone is not
  proof and an unverifiable jurisdiction blocks the gate.
- Do not bind preview deployments to production feedback storage. Run the full
  persistence suite against local Miniflare D1, then deploy the backward-
  compatible backend dark and submit two explicitly synthetic production
  canaries (legacy + v2). Delete both immediately after verifying storage,
  encryption, minimized Discord output and admin access.

### Gate B — web

- Add release manifest, recorder, snapshot builder and form disclosure.
- Enumerate the initial web entry-point/error-code allowlist in the
  implementation plan; no catch-all error-string capture is allowed.
- Add local physical-printer preference.
- Deploy web and verify a controlled supported-printer and custom-printer report.

### Gate C — iOS next release train

- Implement the mirrored Swift recorder/snapshot contract.
- Enumerate and instrument the known engine/export failure entry points; no
  generic error-string capture is allowed.
- Update privacy metadata/copy.
- Run full XCTest/UI suite and on-device TestFlight acceptance before push/release.

The backend ships first and remains backward compatible, so web and iOS do not
need an unsafe coordinated release.

## 12. Verification contract

### Worker/backend

- Exact-schema allowlist and unknown-key rejection.
- Body, field, breadcrumb and JSON-size bounds.
- Rate-limit rejection without persisting the request IP.
- Web origin and native HMAC authentication.
- Legacy-client compatibility.
- Legacy and v2 Printer Intake form/heuristic tee preservation.
- Report-id collision handling.
- AES-GCM round trip and wrong-key/decryption failure.
- D1-write failure versus Discord-failure semantics.
- Discord payload contains only the allowed minimized fields.
- Admin-token rejection and list/detail/disposition/delete behavior.
- Retention deletes expired rows and preserves unexpired rows.
- Fingerprint excludes all identity-like fields.

### Web

- Snapshot contains the selected state and active release/catalog facts.
- Release-manifest `--check` fails on stale asset fingerprints.
- Ring buffer caps at 25 and excludes unknown events/properties.
- Frozen error snapshot is not replaced by later navigation.
- Physical and selected printers remain distinct.
- Bug reports include full diagnostics; other categories remain minimal.
- Correct non-hard-coded release version.

### iOS

- Worker payload parity with shared fixtures.
- Ring buffer evicts oldest entries at 25 and rejects unknown event/property
  keys, matching the web contract.
- Device/release channel and catalog source snapshot.
- Known engine/export errors preserve frozen code + state + Sentry id.
- Generic reports do not create Sentry noise.
- Physical-printer preference remains local until submission.
- UI disclosure, report-id success state and failure retry behavior.

### Acceptance cases

1. Supported physical printer equals selected profile.
2. Unsupported/custom physical printer uses a supported substitute profile.
3. Old legacy iOS payload.
4. Known export failure with Sentry id.
5. Manual UI bug with no printer context.
6. Discord unavailable after successful D1 write.
7. Expired and manually deleted reports disappear from the owner view.
8. A v2 bug report containing a printer request still enters the existing
   heuristic Printer Intake lane.

## 13. Cross-platform and engine/data evaluation

- Web is the schema/Worker owner; iOS mirrors the contract in Swift.
- `engine.js` behavior and all shared data files remain unchanged.
- The feature reads existing state but does not modify profile resolution,
  export output, catalog data or analytics.
- Both user interfaces change because both must disclose diagnostics, manage the
  local physical-printer preference and show the returned report id.
- The iOS push gate remains fully active. Planning/Worker/web delivery does not
  authorize an iOS push or TestFlight dispatch.

## 14. Success criteria

- A new bug report answers version/channel, physical versus selected printer,
  configuration, catalog source, failure operation and recent action sequence
  without asking the reporter for those facts.
- Unsupported/custom physical printers are explicitly distinguishable.
- No persistent user/session/device id is introduced.
- No raw logs, screenshots, generated output or arbitrary state dump is sent.
- User text/email never enters Discord and is encrypted in D1.
- Reports are owner-readable, classifiable and deletable without a new support
  app.
- Legacy released clients continue to submit successfully.
- All rows expire within 90 days.
- EU jurisdiction is proven from current Cloudflare metadata before migration,
  not inferred from a resource name or an older database.
- The complete implementation can be delivered through the three bounded gates
  above, with no accounts or support-platform dependency.

## 15. Cross-model review record

Independent Claude review ran through Bridge from the Codex controller on
2026-07-31 (`bridge --mode claude-only`, exit 0, 292.9 seconds). Durable review
record: [`../../reviews/2026-07-31-feedback-diagnostics-spec-review.md`](../../reviews/2026-07-31-feedback-diagnostics-spec-review.md).

Verdict: **GO-WITH-PATCHES**.

Accepted and applied:

- preserve the existing Printer Intake form/heuristic tee after v2
  normalization;
- replace the vague web-release idea with a generated, drift-checked release
  manifest;
- make EU jurisdiction an evidence gate rather than a naming assumption;
- move fingerprint matching off the submission path;
- collapse status/resolution into one disposition;
- add persistent-feedback rate limiting without storing IP;
- expand privacy work to the current relay/email and Sentry linkage;
- prevent preview deployments from using production report storage;
- mirror ring-buffer eviction tests on iOS;
- remove the unused key-version/keyring design;
- add platform-scoped channels, explicit entry-point inventories, Discord
  failure semantics and local “My printer” disclosure.

No reviewer finding requested accounts, a standalone dashboard, attachments,
or a general logging platform. Those remain explicitly out of scope.
