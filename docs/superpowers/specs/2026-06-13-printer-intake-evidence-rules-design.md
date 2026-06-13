# Printer Intake Evidence Rules Design

**Date:** 2026-06-13
**Project:** 3dprintassistant
**Status:** Draft for subagent review

## Scope

This is a process-hardening pass for the missing-printer intake pipeline before
the real Discord backlog is seeded into KV. It does not add printers, edit the
live catalog, publish an overlay, touch iOS, or run TestFlight.

The change is intentionally narrow:

- strengthen the canonical printer-addition protocol;
- align the Scout and Assistant contracts with the stronger evidence rules;
- optionally add a small deterministic Scout artifact guard so future candidate
  skeletons carry the evidence policy into the assisted pass;
- update planning state after the rules are green.

## Problem

The Voxelab Aries rehearsal proved the pipeline's basic shape, but it also found
edge cases that are not explicit enough in the current process:

- manufacturer data can conflict with reseller data;
- some fields are safety/profile-affecting and must not be inferred casually;
- absence of a feature must not silently become `false`;
- a printer may not fit the current `corexy` / `bedslinger` enum cleanly;
- "no authoritative source found" should block promotion without claiming the
  model is universally impossible;
- a candidate can be valid FDM but still not shippable.

Without codifying these rules, the next real Scout/Assistant run could produce
a packet that looks more certain than the evidence supports.

## Design Goals

1. Preserve the existing fast path for ordinary, well-sourced FDM printers.
2. Make source conflicts visible and review-triggering.
3. Prevent low-confidence data from being presented as ship-ready.
4. Keep the current delivery model: web catalog plus additive iOS overlay; no
   iOS binary release just to add a printer.
5. Keep deterministic Scout behavior realistic: it should triage and stage, not
   pretend to do web research.

## Non-Goals

- No real backlog seeding.
- No Voxelab Aries catalog row.
- No new printer brand.
- No engine enum expansion.
- No change to overlay schema.
- No scheduling change for the Scout.

## Source Authority Model

Every candidate packet must classify sources by authority:

1. **Manufacturer authority**: official product page, official manual, official
   spec sheet, official support/wiki page, or firmware/software profile from the
   manufacturer. This is the preferred source class for all profile-affecting
   fields.
2. **Distributor/reseller authority**: authorized reseller or marketplace page.
   These may corroborate model existence, alternate naming, and availability,
   but they do not override manufacturer sources for safety/profile fields.
3. **Independent review/community evidence**: reputable reviews, forums, videos,
   owner reports, photos. These may help identify physical/mechanical facts such
   as enclosure shape or extruder layout, but they do not override manufacturer
   sources.
4. **Requester text**: useful context only. It never establishes specs or
   taxonomy by itself.

Conflict rule:

- If manufacturer data conflicts with reseller/review/community data, use the
  manufacturer value as the proposed value **only when the model/revision/region
  clearly matches**.
- The conflict must still be recorded as a risk flag.
- Any conflict on a profile-affecting or safety-affecting field blocks the
  candidate from `ship-ready` until the Assistant has surfaced it and reviewer
  dispatch has returned GO.
- If two manufacturer sources conflict, the candidate is
  `needs-source-resolution` and must not ship until resolved.

## Field Confidence Rules

Candidate packets must classify each drafted field as:

- `confirmed`: supported by a cited manufacturer source or by multiple
  compatible non-manufacturer sources when the field is not safety/profile
  critical.
- `inferred`: derived from clearly stated evidence, but not directly listed as
  a spec. Inferred values may appear only with a risk flag and cannot make a
  candidate ship-ready if the field is safety/profile critical.
- `low-confidence`: missing, contradictory, or based on weak evidence.

Safety/profile-critical fields:

- `series`
- `enclosure`
- `active_chamber_heating`
- `max_chamber_temp` if present or proposed
- `extruder_type`
- `max_nozzle_temp`
- `max_bed_temp`
- `max_speed`
- `max_acceleration`
- `available_nozzle_sizes`
- `available_plates`
- `multi_color_systems`
- `has_lidar`
- `has_camera`
- `open_door_threshold_bed_temp` if present or proposed
- `notes` when they contain warnings, material limits, or operating constraints

Rules:

- `manufacturer`, `model/name`, and FDM/non-FDM status must be confirmed before
  candidate promotion beyond `needs-research`.
- `max_nozzle_temp` and `max_bed_temp` must be sourced from manufacturer data
  unless explicitly approved after conflict review.
- Boolean absence is not proof. `false` must be backed by official specs,
  manual evidence, explicit "not equipped" style documentation, or a recorded
  absence rationale. A sufficient absence rationale says which source classes
  were checked, what feature would normally be advertised if present, and why
  the omission is safe for this field. Example: official manual + product page
  list no camera/lidar and product photos show no sensor module; `has_camera:
  false` can be `inferred` with a risk note. It is not `confirmed`.
- A low-confidence safety/profile-critical field blocks `ship-ready`.
- Fields that are required by `printers.json` but cannot be sourced are blockers,
  not placeholders.

## Taxonomy Rules

The protocol already requires owner approval for a new `brands[]` row and warns
against inventing `series_group`. This pass adds:

- new brand + no sibling series group means `needs-owner-taxonomy`;
- new `series_group` must be explicitly proposed and visually checked;
- if a printer does not cleanly fit the engine's current `corexy` /
  `bedslinger` enum, it is `needs-taxonomy-decision`;
- do not extend the engine enum in a printer-add commit;
- if a third series bucket is needed, that becomes a separate engine/app/
  validator/spec arc.

## Outcome Classes

Use these labels consistently, but keep ownership explicit:

Deterministic Scout outcomes:

- `duplicate`: already bundled; no add.
- `declined-non-fdm`: resin, SLA/MSLA/LCD/DLP, SLS/MJF, or other non-FDM.
- `unactionable`: empty/spam/no model signal.
- `incomplete`: brand/model information is insufficient.
- `needs-research`: deterministic Scout found a novel request but FDM/specs are
  not confirmed yet.
- `parse-error`: an ingestion entry could not be parsed; operational error, not
  a printer decision.

Assisted research / Assistant outcomes:

- `unverified-model`: no authoritative source confirms the model; do not claim
  universal nonexistence.
- `needs-source-resolution`: the model is plausible, but required evidence is
  missing or conflicting.
- `needs-owner-taxonomy`: owner must approve a new brand, new series group, or
  non-obvious taxonomy.
- `needs-taxonomy-decision`: the model does not map cleanly to current engine
  taxonomy.
- `blocked`: a candidate has enough shape to review, but validators, source
  conflicts, or required owner/reviewer gates prevent shipping.
- `ship-ready`: all required fields are confirmed, validators are green, owner
  gates are satisfied, and required reviewer dispatches have returned GO.

Only the Assistant can promote a packet to `ship-ready`; the deterministic Scout
cannot. The deterministic Scout must not emit `unverified-model`,
`needs-source-resolution`, `needs-owner-taxonomy`, `needs-taxonomy-decision`,
`blocked`, or `ship-ready`, because those require web research, source weighing,
or owner/reviewer judgment.

## Review Triggers

The existing risk-trigger list remains, with these additions:

- source conflict on any safety/profile-critical field;
- any `inferred` value for `series`, `enclosure`, `active_chamber_heating`,
  `extruder_type`, `max_nozzle_temp`, or `max_bed_temp`;
- non-obvious `corexy` / `bedslinger` mapping;
- `false` value for feature booleans based only on missing mentions;
- manufacturer-vs-manufacturer conflict.

Reviewer dispatch is required before a candidate with any of these triggers can
ship.

## Implementation Shape

Gate 1: Spec review and patch

- Write this design spec.
- Dispatch a subagent review focused on completeness, contradictions, and
  operational fit with the existing Scout/Assistant split.
- Patch the spec until reviewer verdict is GO.

Gate 2: Write implementation plan

- Create a bite-sized plan with review gates per task.
- Each task must be independently committable.

Gate 3: Protocol hardening

- Update `docs/runbooks/printer-addition-protocol.md` with source hierarchy,
  field confidence, taxonomy edge case, outcome classes, and added review
  triggers.
- Review via subagent.
- Patch until GO.
- QA: `git diff --check`; grep the protocol for the new authority hierarchy,
  `needs-source-resolution`, `needs-owner-taxonomy`, `needs-taxonomy-decision`,
  `parse-error`, `blocked`, and the added review triggers.

Gate 4: Agent contract alignment

- Update `ai-operating-model/docs/agents/printer-intake-scout.md`.
- Update `ai-operating-model/docs/agents/printer-addition-assistant.md`.
- The Scout contract must remove claims that the deterministic Scout researches
  specs, drafts complete rows/overlay entries, runs validators, or produces a
  ship-ready candidate. It stages `needs-research` skeletons and triage reports
  only.
- The Scout contract must say deterministic output cannot be `ship-ready` and
  must not use assisted-only outcomes.
- The Assistant contract must say source conflicts and low-confidence critical
  fields block shipping.
- Review via subagent.
- Patch until GO.
- QA: `git diff --check`; grep both contracts for deterministic-only Scout
  language, assisted-only outcome ownership, source hierarchy, field confidence,
  and no iOS/TestFlight shipping requirement.

Gate 5: Deterministic Scout artifact guard, if plan confirms value

- Add tests first for candidate skeleton evidence policy and outcome vocabulary.
- Update `scripts/printer-intake-scout.js` only enough for staged skeletons to
  carry the new policy into the assisted pass.
- Review via subagent.
- Patch until GO.
- QA: `node scripts/printer-intake-scout.test.js`.

Gate 6: Planning surface update

- Update `docs/planning/ROADMAP.md` and next-session handoff if needed.
- Review via subagent or final review if changes are only status text.
- QA: `git diff --check`; grep ROADMAP/NEXT-SESSION for the next action being
  process-hardened backlog seeding, not direct Aries shipping.

## Data / Logic Change Evaluation

This design itself changes process docs only. If Gate 5 is accepted, the Scout's
candidate skeleton JSON changes, but live printer data and engine logic do not.

Web impact:

- No user-visible web app change.
- If Gate 5 lands, private staged Scout artifacts become clearer for the
  assisted pass.

iOS impact:

- No iOS binary, TestFlight, or App Store action.
- Remote overlay behavior is unchanged.

Engine/data-model impact:

- No engine change in this arc.
- The design explicitly prevents engine taxonomy expansion from being mixed
  into a printer-add commit.

## Acceptance Criteria

- Spec reviewed by subagent and patched to GO.
- Implementation plan exists and is split into gate-sized tasks.
- Protocol and contracts state source authority, conflict handling, confidence
  rules, taxonomy edge-case handling, and outcome classes.
- Any code change is test-first and verified with the existing Scout test suite.
- No live catalog, overlay, or iOS bundled data changes.
- Final repo state is committed, pushed for web/ai-om docs as appropriate, and
  sync hold is released.

## Addendum — post-Aries-rehearsal hardening (2026-06-13)

The Voxelab Aries delivery rehearsal returned NO-GO on two gaps that the rules
above did not yet cover. Both are added to the canonical protocol
(`docs/runbooks/printer-addition-protocol.md`) and the agent contracts.

### A1 — App-side acceleration cap for unpublished `max_acceleration`

`max_acceleration` is profile/safety-critical, but some legitimate FDM printers
(typically older / budget machines) have no manufacturer-published acceleration
figure. The protocol now permits an explicitly-labeled conservative **app-side
cap** in the existing `max_acceleration` field, gated by four conditions
(documented null-source sweep, conservative value vs. siblings, required
`notes[]` provenance line, reviewer GO) and a new reviewer trigger.

This is sound and acceleration-only because `max_acceleration` is **advisory-only
in the engine** — read solely by the HIGH-012 bedslinger warning copy, never a
clamp on emitted accelerations. A conservative cap can only make that advisory
more cautious. No new JSON key, no engine/validator/schema change (a structured
provenance key would be rejected by the overlay allowlist and is out of scope);
the manufacturer-vs-app-cap separation lives at the protocol/evidence layer.
Every other unpublished profile/safety-critical field stays `low-confidence` and
blocks `ship-ready`.

**Named honesty limitation.** The HIGH-012 warning renders the value as
`"<printer> tops out at <X> mm/s²"` with no provenance hedge, so an app cap reads
to the user as the printer's ceiling. This is safe (conservative, never
inflated) but understates a machine whose real ceiling is higher. The protocol
names this rather than hiding it and points to a non-blocking follow-up — surface
`notes[]` to users (deferred Phase 2.7b notes-rendering) and/or hedge the
HIGH-012 copy for `app-cap` accelerations — which touches engine/UI and must land
in its own reviewed change, not a printer-add. This is the user-visible
"data-quality warning" lever for app-capped fields.

### A2 — Data-only iOS XCTest waiver

The protocol hard-required iOS XCTest before Phase 5, but full Xcode is not
installed on the running machine, so XCTest cannot run locally. The protocol now
permits a **narrowly-scoped data-only waiver**: for adds that touch no
`engine.js` / Swift / data-schema / new-data-key / validator / spec and are
byte-identical web↔iOS (`diff -q` clean), the web engine gates + overlay
validator stand in for local XCTest.

Sound on both iOS surfaces for a value-only add: (1) iOS runs the same
`engine.js` bytes over the same `printers.json` bytes, so engine output matches
the green web walkthrough; (2) the Swift `Codable` decode is safe for additive
values in existing keys per `3dpa-context.md` standing rule #9 (additivity holds
*because* changes stay value-only — a new key is not promised, hence a void
condition). **Void conditions** (any engine/Swift/schema/validator/spec change, a
new data key, or a new engine-branched enum value in `series`/`enclosure`/
`extruder_type`) require real XCTest on CI or a full-Xcode Mac. When an overlay
is published the Node overlay validator is a required, non-waivable proxy for the
iOS `PrinterCatalogProvider` validate/merge/decode path (a strict superset of the
forgiving Swift decode). The waiver is always logged, never silent, and relaxes
only the *local* bundled-mirror XCTest — never the overlay validator or XCTest
when a void condition fires.
