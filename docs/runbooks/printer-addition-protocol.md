# Printer Addition Protocol

Use whenever adding, republishing, or deprecating a printer in 3dpa.

**Background.** Authored after the post-mortem of the X2D / H2D Pro overlay-only
mishap (2026-05-10) and the SPARKX i7 → Creality i7 taxonomy fix (2026-05-12). v2
(2026-05-15) trimmed per Codex review: replaced paste-bash with a checked-in
picker dry-run script, merged the verification phases, made reviewer dispatch
risk-triggered instead of mandatory. See
[`codex/printer-addition-protocol-review/codex-2026-05-15-printer-addition-protocol-packet.md`](../../codex/printer-addition-protocol-review/codex-2026-05-15-printer-addition-protocol-packet.md)
for the full simplification trail. v4 (2026-05-15) added Phase 1 step 0
(FDM-only scope check) after a Photon Mono M7 Pro request surfaced the implicit
assumption.

## Mental model (read first — load-bearing)

- **Source of truth = bundled data.** Web reads `data/printers.json`. iOS reads
  its own copy at `3DPrintAssistant/Data/printers.json` (byte-identical mirror)
  plus the overlay merged on top.
- **Overlay = additive same-day patch**, not an alternative path. Current iOS
  binary users see overlay entries until the next binary subsumes them.
- **Done = all three surfaces agree** on id, manufacturer, series_group, every spec field.
- **Overlay cannot retract a bundled entry from a shipped iOS binary.**
  Deprecation is asymmetric (see Phase 4).

## Evidence rules (before trusting a candidate)

### Source authority

Classify every source used for a candidate:

1. **Manufacturer authority** — official product page, manual, spec sheet,
   support/wiki page, or manufacturer software/firmware profile. Use this class
   for profile-affecting and safety-affecting fields whenever possible.
2. **Distributor/reseller authority** — authorized reseller or marketplace page.
   May corroborate model existence, alternate naming, and availability, but does
   not override manufacturer data for profile/safety fields.
3. **Independent review/community evidence** — reputable reviews, owner reports,
   videos, forums, and photos. May help identify physical/mechanical facts such
   as enclosure shape or extruder layout, but does not override manufacturer
   data.
4. **Requester text** — context only. It never establishes specs or taxonomy by
   itself.

If manufacturer data conflicts with reseller/review/community data, use the
manufacturer value as the proposed value only when the model/revision/region
clearly matches. Record the conflict as a risk flag and dispatch review before
shipping. If two manufacturer sources conflict, the candidate is
`needs-source-resolution` and must not ship until resolved.

### Field confidence

Each drafted field is one of:

- `confirmed` — directly supported by a cited manufacturer source, or by
  multiple compatible non-manufacturer sources only when the field is not
  profile/safety critical.
- `inferred` — derived from clear evidence but not directly listed as a spec.
  Inferred values on profile/safety fields require a risk flag and review, but
  cannot make a candidate `ship-ready`.
- `low-confidence` — missing, contradictory, weakly sourced, or based on silence.
- `app-cap` — a narrowly-scoped exception for `max_acceleration` only (see
  "App-side acceleration cap" below): a conservative app-side ceiling used when
  no manufacturer acceleration figure exists. Does not block `ship-ready` when
  its four conditions plus reviewer GO all hold; never valid for any other field.

Profile/safety-critical fields are:
`series`, `enclosure`, `active_chamber_heating`, `max_chamber_temp` if present or proposed,
`extruder_type`, `max_nozzle_temp`, `max_bed_temp`, `max_speed`,
`max_acceleration`, `available_nozzle_sizes`, `available_plates`,
`multi_color_systems`, `has_lidar`, `has_camera`,
`open_door_threshold_bed_temp` if present or proposed, and `notes` when they contain
warnings, material limits, or operating constraints.

Boolean absence is not proof. A `false` value needs official/manual evidence,
explicit "not equipped" documentation, or a recorded absence rationale. A
sufficient absence rationale says which source classes were checked, what
feature would normally be advertised if present, and why the omission is safe
for this field. Silence alone is `low-confidence`.

A low-confidence profile/safety-critical field blocks `ship-ready`.
`manufacturer`, `model` / `name`, and FDM/non-FDM status must be confirmed
before promotion beyond `needs-research`. `max_nozzle_temp` and `max_bed_temp`
must be sourced from manufacturer data unless explicitly approved after conflict
review.

#### App-side acceleration cap (`max_acceleration` only)

`max_acceleration` is the one profile/safety-critical field that may ship without
a manufacturer-sourced value, via an explicitly-labeled conservative **app-side
cap**. The exception exists because, unlike every other field in the list,
`max_acceleration` is **advisory-only** in the engine: it is read solely by the
HIGH-012 bedslinger warning copy (`engine.js`, `"<printer> tops out at <X> mm/s²
acceleration…"`) and never clamps an emitted value (emitted accelerations come
from `objective_profiles` material/tier maps with their own caps). A conservative
cap can therefore only make that advisory more cautious; it cannot push any
emitted acceleration into an unsafe range. No other field has this property, so
the exception is **acceleration-only** — every other unpublished profile/safety
field stays `low-confidence` and blocks `ship-ready`.

An `app-cap` `max_acceleration` may ship only when **all four** hold:

1. **Documented null-source sweep.** Manufacturer (product page, manual, spec
   sheet, firmware/software profile), reseller, and community source classes
   were all checked and none publishes an acceleration figure. Record the
   sources checked (paths/URLs) in the commit body and candidate packet — a
   silent "couldn't find one" is not sufficient.
2. **Conservative value vs. siblings.** The value is at or below the **lowest
   `max_acceleration` already shipped in the same engine bucket** (e.g.
   `bedslinger`) — that lowest sibling ceiling is the hard floor, not a target.
   Name the sibling(s) compared against in the commit body. A value above any
   sibling's ceiling is not an app cap and is rejected.
3. **Required `notes[]` provenance line.** The printer object carries a `notes[]`
   line naming the value a conservative app-side cap used because no manufacturer
   maximum was published — never presented as a manufacturer spec.
4. **Reviewer GO.** App-cap use is a mandatory reviewer-dispatch trigger (see
   Phase 5 → Risk-triggered reviewer dispatch).

**Honesty limitation (named, not hidden).** The HIGH-012 bedslinger warning
renders this value verbatim as `"<printer> tops out at <X> mm/s²"` with no
provenance qualifier, so an app cap is shown to the user as if it were the
printer's hardware ceiling. Conditions 1–4 make this *safe* (a defensible
conservative ceiling, never an inflated one) but not fully *honest* — a cap set
below the printer's true capability understates the machine. The app-cap path
accepts this because the field is advisory-only and the conservative value keeps
the advice correct, but the gap is real and is named here rather than glossed.
Closing it fully is a separate, non-blocking follow-up: surface the `notes[]`
provenance to users (the deferred Phase 2.7b notes-rendering) and/or hedge the
HIGH-012 copy for `app-cap` accelerations (e.g. "no published figure —
conservative estimate"). Both touch `engine.js` / UI and must land in their own
reviewed change, never inside a printer-add arc.

If any condition is missing, `max_acceleration` is `low-confidence` and blocks
`ship-ready`. `app-cap` is valid for `max_acceleration` and nothing else; it
never licenses shipping any other unpublished profile/safety-critical field.
Enforcement is reviewer-gated, not validator-gated: no data validator carries
acceleration provenance (the overlay allowlist rejects a provenance key), so the
Phase 5 reviewer trigger is the control that confirms conditions 1–4.

### Outcome classes

Deterministic Scout outcomes:

- `duplicate` — already bundled; no add.
- `declined-non-fdm` — resin, SLA/MSLA/LCD/DLP, SLS/MJF, or other non-FDM.
- `unactionable` — empty/spam/no model signal.
- `incomplete` — brand/model information is insufficient.
- `needs-research` — novel request; FDM and specs are not confirmed yet.
- `parse-error` — ingestion entry could not be parsed; operational error, not a
  printer decision.

Assisted research / Assistant outcomes:

- `unverified-model` — no authoritative source confirms the model; do not claim
  universal nonexistence.
- `needs-source-resolution` — required evidence is missing or conflicting.
- `needs-owner-taxonomy` — owner must approve a new brand, new series group, or
  non-obvious taxonomy.
- `needs-taxonomy-decision` — model does not map cleanly to the current engine
  taxonomy.
- `blocked` — validators, source conflicts, or owner/reviewer gates prevent
  shipping.
- `ship-ready` — all required fields are confirmed, validators are green, owner
  gates are satisfied, and required reviewer dispatches have returned GO.

The deterministic Scout never emits assisted-only outcomes.

## Phase 1 — Taxonomy decision (before editing any file)

0. **FDM-only scope check.** 3dpa generates **FDM (filament extrusion)** slicer
   profiles only. The engine routes to `bambu_studio` / `prusaslicer` /
   `orcaslicer`; materials are thermoplastics; nozzles and retraction are
   first-class concepts. Decline any candidate that is **resin (MSLA / LCD /
   SLA / DLP)**, **powder-bed (SLS / MJF)**, or any other non-FDM technology
   — e.g. Anycubic Photon line, Elegoo Saturn / Mars, Formlabs Form, Phrozen
   Sonic, Creality Halot. No plans for resin or other non-FDM support; log
   the decline and stop. If the requester also runs an FDM printer, offer to
   add that one instead.
1. **Record sources.** Vault clipping paths or manufacturer URL. Paths go in the
   commit body. No second-hand recollection.
2. **Decide four fields:**
   - `manufacturer` — must match an existing brand id unless owner has explicitly
     approved a new `brands[]` row. Last legitimate new brand was years ago; new
     brands are rare.
   - `series_group` — the picker sub-header label under the brand. Reuse a
     sibling's label; do not invent.
   - `id` — stable internal id, `snake_case`. Once published in an overlay, it
     cannot change.
   - `name` — picker row label.
   If a new brand has no sibling `series_group`, mark the candidate
   `needs-owner-taxonomy`. If `series` does not cleanly fit the current
   `corexy` / `bedslinger` engine enum, mark it `needs-taxonomy-decision`; do
   not extend the engine enum inside a printer-add commit.
3. **Sanity question.** Where does the manufacturer themselves put this on their
   site/store? If your decision disagrees with that, stop and re-check.

## Phase 2 — Picker dry-run (pre-commit gate)

After editing `data/printers.json`, before committing, run:

```bash
node scripts/picker-dry-run.js <brand_id> <series_group> <printer_id> [wrong_brand_id]
```

Example: `node scripts/picker-dry-run.js creality "i Series" sparkx_i7 sparkx`

GREEN = proceed to Phase 3. RED = taxonomy is wrong, return to Phase 1. The
optional `wrong_brand_id` arg asserts that a specific brand id does **not**
exist — use it whenever sources contain a misleading brand cue (the SPARKX/i7
class of bug).

The script is tested by `scripts/picker-dry-run.test.js`; run
`node scripts/picker-dry-run.test.js` if you touch the script itself.

## Phase 3 — Implementation + verification

**Commits.** One printer = one focused commit per repo:

1. **Web commit** — `data/printers.json` + `scripts/walkthrough-harness.js`
   combo for the new printer. Subject: `data: add <brand> <model> (<series_group>)`.
2. **iOS mirror commit** — byte-identical `cp` of `data/printers.json` to the
   iOS bundled copy. Subject: `data: sync printers.json — add <brand> <model>`.
3. **Overlay commit (only if shipping to current iOS users)** — edit
   `catalog/ios-printer-overlay-v1.json` payload, bump `content_version`,
   recompute `payload_sha256` per
   [`docs/specs/ios-remote-printer-catalog.md`](../specs/ios-remote-printer-catalog.md),
   run `node scripts/validate-ios-printer-overlay.js`. Only include printer
   fields the overlay validator accepts (the spec's allowlist); if bundled
   data needs a new field the overlay can't carry, either extend the overlay
   spec + validator in a separate reviewed arc, or ship bundled-only. Subject:
   `data: publish <brand> <model> iOS overlay (content_version=YYYYMMDDNN)`.

**Forbidden in any of these commits:** `engine.js` touches, marketing copy
edits, correction sweeps across other printers, validator code changes.
Those land in their own arc.

**Verification — all green before Phase 5:**

From the **web repo** (`Projects/3dprintassistant/`):

```bash
node scripts/validate-data.js
node scripts/picker-dry-run.js <brand_id> <series_group> <printer_id> [wrong_brand_id]
node scripts/walkthrough-harness.js
node scripts/profile-matrix-audit.js
node scripts/validate-ios-printer-overlay.js   # only if overlay touched
```

From the **iOS repo** (`Projects/3dprintassistant-ios/`):

```bash
xcodebuild test -project 3DPrintAssistant.xcodeproj -scheme 3DPrintAssistant \
  -destination 'platform=iOS Simulator,name=iPhone 17,OS=<available>' \
  -only-testing:3DPrintAssistantTests CODE_SIGNING_ALLOWED=NO
```

**Data-only iOS XCTest waiver.** When full Xcode is unavailable on the running
machine (e.g. `xcodebuild` points at `CommandLineTools` and no
`/Applications/Xcode*.app` is installed), the iOS XCTest gate above MAY be waived
for a printer add **only** when **all** of these hold:

- the change touches **no** `engine.js`, no Swift, no data **schema** — i.e. only
  values in existing `printers.json` fields, **no new data keys** — and no
  validator or spec file;
- the iOS bundled `printers.json` is **byte-identical** to web
  (`diff -q web iOS` exit 0);
- every web engine gate is green (`validate-data`, `picker-dry-run`,
  `walkthrough-harness`, `profile-matrix-audit`), plus the overlay validator when
  the overlay is touched.

Rationale — iOS exercises `printers.json` on two surfaces, both covered for a
value-only add:

1. **Engine behavior.** iOS runs the **same `engine.js` bytes** via
   JavaScriptCore over the **same `printers.json` bytes**, so a value-only edit in
   existing fields produces a result identical to the green web walkthrough.
2. **Swift-native `Codable` decode** (`Printer.swift`). Additive *values* in
   existing keys cannot break decoding. Per `docs/3dpa-context.md` standing
   rule #9 ("Locked schema additivity"), the iOS Codable layer decodes
   null/missing fields cleanly **because we keep changes additive** — that safety
   holds only for value-only edits within existing keys. A *new key* is exactly
   what rule #9 does not promise, which is why it is a void condition below
   (appending a value to an existing array field, e.g. a `notes[]` line, is a
   value add, not a new key).

**Void conditions — waiver does NOT apply, real XCTest is required.** Any of:
an `engine.js`, Swift, data-schema, validator, or spec change; a **new data
key**; or a **new enumerated value in an engine-/iOS-branched field** (`series`,
`enclosure`, `extruder_type`). A new free-string label that nothing branches on
(a new `series_group`, or a new brand `name` / `id`) is a value add, not a void
condition. In any void case, run XCTest on CI or a Mac with full Xcode before
shipping; never waive.

**Overlay publish is compatible with the waiver, but the overlay validator is
not.** Whenever the overlay is touched, `node scripts/validate-ios-printer-overlay.js`
is a **required, non-waivable** gate. It is the sanctioned proxy for the iOS
overlay validate / merge / decode path (`PrinterCatalogProvider`): it enforces
the field allowlist, types, enum allowlists, `payload_sha256`, `content_version`,
and `min_app_version` vs the iOS `MARKETING_VERSION` — a strict superset of the
forgiving Swift decode, so a green overlay validator guarantees the iOS merge +
`Codable` round-trip succeeds. The data-only waiver substitutes only for the
*bundled-mirror* XCTest; it never substitutes for the overlay validator.

**Logging.** When the waiver is used, state it explicitly in the commit body and
session log — which web gates ran, the `diff -q` byte-identical result, and that
iOS XCTest was waived as data-only — never silently. The waiver substitutes for
*local* XCTest only; it is not a substitute for XCTest when any void condition
fires.

**Owner visual picker check** — required if (a) the overlay was published OR
(b) a new brand row was added OR (c) a new `series_group` was introduced. Open
the running web app and confirm the printer appears under the expected
brand → series_group. If wrong: STOP, fix taxonomy, replay Phase 3.

**Live overlay confirmation** — only if Phase 3 step 3 ran. After web push +
Cloudflare deploy:

```bash
curl -s https://3dprintassistant.com/catalog/ios-printer-overlay-v1.json \
  | jq '{content_version, printers: .payload.printers|map(.id)}'
```

Confirm `content_version` matches what you published.

## Phase 4 — Deprecation / removal (asymmetric)

The overlay cannot retract what is already bundled in shipped iOS binaries.
Removing a printer is rare and requires care. **Before any deprecation work,
read the overlay spec at
[`docs/specs/ios-remote-printer-catalog.md`](../specs/ios-remote-printer-catalog.md)
and decide deprecate (keep id, hide from picker, preserve stored profiles) vs
remove (mistake / never-public only).** When the first real deprecation
happens, capture the executed procedure here as Phase 4a.

### Phase 4b — Overlay → bundled graduation (MANDATORY at each binary release)

An overlay entry is a *transitional* delivery for clients whose bundled
`printers.json` does not yet contain that printer. How a graduation (a printer
baked into a new iOS binary) is handled depends on whether the **still-delivered**
builds that bundle it are before or at/after the override-merge boundary
(`FIRST_OVERRIDE_MERGE_VERSION = 1.0.5`, iOS `af4bbe0` / Part C):

- **Builds `< 1.0.5` reject the WHOLE overlay on any overlay-vs-bundled id
  collision** (`PrinterCatalogProvider.validatePayload`, all-or-nothing). So if a
  printer is bundled in any still-delivered build below 1.0.5 (e.g. `sparkx_i7`
  baked into v1.0.4), it **must be removed from the overlay** — a stale entry
  silently hides every *other* printer the overlay carries on that build.
- **Builds `>= 1.0.5` override-merge the overlay by id** (the overlay row replaces
  the bundled one), so a graduated entry is harmless there. **Keep the entry in
  the overlay when a still-delivered build at/above `min_app_version` but below the
  graduating version does NOT bundle it** — that is the only way those clients get
  it. Example: `aries`/`mega_x` graduated into the v1.0.5 bundle, but the v1.0.4
  App-Store majority does not bundle them, so they stay in the overlay and v1.0.5
  override-merges them.

In BOTH cases the same release must:

1. **Reconcile `catalog/ios-printer-overlay-v1.json`** per the rule above (remove
   only if bundled in a still-delivered pre-1.0.5 build; otherwise keep), bump
   `content_version`, recompute `payload_sha256`.
2. **Add a `catalog/ios-bundled-catalog-baselines.json` entry for the new binary
   version** (`brand_ids` + `printer_ids` snapshot of that build's bundled
   `printers.json`, generated programmatically, with a `source` line). The ship
   validator (`scripts/validate-ios-printer-overlay.js`) requires baselines for
   **both** `min_app_version` and the current `MARKETING_VERSION`, and collides
   overlay ids against the union of baselines in
   `[min_app_version, FIRST_OVERRIDE_MERGE_VERSION)` — pre-Part-C builds only; a
   missing required baseline fails the gate.

Root cause of the 2026-06-14 Aries-invisible-on-iOS incident: `sparkx_i7` was
not removed from the overlay when v1.0.4 (a pre-Part-C build) baked it in, so when
Aries was later added to the same overlay the i7 collision dropped the entire
overlay on v1.0.4. See
`docs/superpowers/specs/2026-06-14-ios-overlay-aries-collision-fix-design.md`. The
Part-C override-merge boundary shipped in v1.0.5 (iOS `af4bbe0`); the validator was
made boundary-aware on 2026-06-20 so graduated entries can stay in the overlay for
the pre-1.0.5 majority.

## Phase 5 — Self-check (11-bullet checklist; gates Trigger A wrap-up)

Run through this list before declaring the session complete. Every line must
be `[x]` or have an explicit reason it does not apply. If any line is `[ ]`,
the wrap-up is blocked.

- [ ] Sources cited in plan or commit body (path or URL).
- [ ] Taxonomy matches existing brand picker; new `brands[]` row, if any, has
      explicit owner sign-off.
- [ ] Phase 2 picker dry-run output captured in commit body or session log.
- [ ] Web commit is one printer; no `engine.js`, marketing, or correction-sweep
      mixing.
- [ ] iOS mirror commit byte-identical (`diff -q web iOS` exit 0).
- [ ] Overlay commit (if any): `content_version` bumped, `payload_sha256`
      recomputed, validator green.
- [ ] `validate-data` + `walkthrough-harness` + `profile-matrix-audit` + iOS
      XCTest all green at HEAD — OR, for a data-only add (no engine / Swift /
      schema / new-data-key change), the **data-only iOS XCTest waiver** is
      invoked and logged: web gates green + `diff -q` byte-identical stand in for
      local XCTest, and the void conditions were checked and none fired.
- [ ] No `engine.js`, `app.js`, validator, or spec file edited in printer
      commits.
- [ ] Owner visual picker check OK (only if overlay touched, new brand, or new
      series_group).
- [ ] Live overlay URL confirms published `content_version` (only if overlay
      was deployed).
- [ ] Overlay → bundled graduation (Phase 4b): if a printer was baked into a new
      iOS binary this cycle, its overlay entry was reconciled per the override-merge
      boundary (removed only if bundled in a still-delivered pre-1.0.5 build;
      otherwise kept) AND a `ios-bundled-catalog-baselines.json` baseline was added
      for the new binary version. (N/A if no binary graduated a printer this cycle.)

### Risk-triggered reviewer dispatch

Escalate to `superpowers:requesting-code-review` against the printer-add diff
when **any** of these fire:

- New `brands[]` row added.
- New `series_group` introduced under an existing brand.
- Overlay publish to current iOS users (not bundled-only).
- `engine.js`, `app.js`, validator, or overlay spec touched anywhere in the
  diff.
- Sources conflicted on a key spec field.
- Source conflict on any profile/safety-critical field.
- Any `inferred` value for `series`, `enclosure`, `active_chamber_heating`,
  `extruder_type`, `max_nozzle_temp`, or `max_bed_temp`.
- Non-obvious `corexy` / `bedslinger` mapping.
- App-side acceleration cap (`app-cap`) used for an unpublished `max_acceleration`.
- `false` value for feature booleans based only on missing mentions.
- Manufacturer-vs-manufacturer conflict.
- Deprecation or removal (Phase 4).
- More than one printer added in the same session.

If none of those fire, the self-check above is sufficient. This aligns with
the risk-based second-model rule in
[`../../../ai-operating-model/docs/ai-collab.md`](../../../ai-operating-model/docs/ai-collab.md).

## What this protocol forbids

- **Adding** a printer to the overlay unless bundled `data/printers.json`
  already contains the same printer. Overlay-only cleanup, rollback
  (`enabled: false`), and corrected republish are explicitly allowed when
  following the overlay spec — those flows are not "adds" and do not need
  bundled changes.
- **Leaving** an overlay entry in place after that printer is baked into a
  still-delivered *pre-1.0.5* bundled iOS binary — those builds reject the whole
  overlay on collision, so the Phase 4b graduation step must remove it and add a
  baseline for the new binary version. (Graduation into a `>= 1.0.5` build
  override-merges, so the entry is KEPT when a lower delivered build still needs
  it — see Phase 4b.)
- Mixing a printer add with engine, marketing, correction-sweep, or validator
  work.
- Adding a new `brands[]` row without owner sign-off.
- Trusting a single source for taxonomy.
- Running Trigger A wrap-up before Phase 5 self-check is fully `[x]` (and
  reviewer dispatch returned GO, if triggered).

## Cross-references

- Overlay system spec: [`../specs/ios-remote-printer-catalog.md`](../specs/ios-remote-printer-catalog.md)
- Standard data-change gate: [`./profile-data-change-test-protocol.md`](./profile-data-change-test-protocol.md)
- Standing rules: [`../3dpa-context.md`](../3dpa-context.md) (rule 10)
- Vault trigger: `Obsidian Vault/20-Areas/Development/ai-collaboration/trigger-cheatsheet.md` → "Printer Addition Gate"
- v1 → v2 simplification trail: [`../../codex/printer-addition-protocol-review/codex-2026-05-15-printer-addition-protocol-packet.md`](../../codex/printer-addition-protocol-review/codex-2026-05-15-printer-addition-protocol-packet.md)
