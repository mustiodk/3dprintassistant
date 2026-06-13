# Printer Intake Researcher Rehearsal - 2026-06-13

## Scope

Dry-run of the Printer Addition Assistant on one real candidate plus three
adversarial cases. No production data, overlay, iOS bundle, or Worker files were
edited.

The current printer-addition process is intentionally web-side:

- Source of truth: `3dprintassistant/data/printers.json`.
- Current iOS users: additive `catalog/ios-printer-overlay-v1.json` after the
  bundled row exists.
- iOS repo: byte-identical bundled-data mirror committed locally only; no iOS
  push, no TestFlight, and no app version bump just to add a printer.
- Human gates: per-candidate approval, explicit new-brand approval, visual
  picker check when adding a new brand/series group or publishing overlay.

## Sources Consulted

- Printer Addition Assistant contract:
  `ai-operating-model/docs/agents/printer-addition-assistant.md`
- Canonical runbook:
  `3dprintassistant/docs/runbooks/printer-addition-protocol.md`
- Local catalog: `3dprintassistant/data/printers.json`
- Voxelab Aries official manual:
  `https://enfss.voxelab3dp.com/10000/software/704d44cbccfc0bc0ab8dfa2747925e31.pdf`
- Voxelab Aries retailer/spec listing used as conflict source:
  `https://www.3dprintersonlinestore.com/voxelab-aries-3d-printer`
- Voxelab Aries third-party reviews used only for mechanical/enclosure clues:
  `https://www.tomshardware.com/reviews/voxelab-aries-3d-printer`
  and `https://the-gadgeteer.com/2021/12/28/voxelab-aries-3d-printer-review/`
- Anycubic Photon Mono M7 Pro official product/wiki:
  `https://store.anycubic.com/products/photon-mono-m7-pro`
  and `https://wiki.anycubic.com/en/resin-3d-printer/photon-mono-m7-pro`
- Nonexistent-printer check:
  searched `Bambu Lab X9 Unicorn 3D printer official` and
  `site:bambulab.com "X9 Unicorn"`; no authoritative manufacturer source found.

## Case 1: Voxelab Aries

Recommendation: **candidate, but blocked before shipping**.

Why it passes the first gate:

- The Voxelab manual identifies the model as Voxelab Aries.
- The manual's equipment parameters list FDM forming technology.
- The same parameter block lists 200x200x200mm print size, one nozzle, standard
  0.4mm nozzle, 1.75mm PLA/ABS/PETG filament, hotbed <=110 C, nozzle <=250 C,
  and print speed <=180mm/s / 50-80mm/s normally.

Why it is not ready for the Assistant to ship:

- `voxelab` is not an existing `brands[]` id. A new brand row requires explicit
  owner sign-off.
- `series_group` cannot be reused from a sibling because the brand does not
  exist yet. A proposed label such as `Aries` or `Aries Series` needs owner
  approval and visual picker review.
- `series` is not trivial. The engine currently accepts only `corexy` or
  `bedslinger`; Aries is a fixed-bed-XY / Z-bed Cartesian-style machine, not a
  literal CoreXY and not a bed-slinger. `corexy` may be the closest current
  performance bucket because the bed does not sling on Y, but this should be an
  explicit data-model decision before committing.
- `enclosure` is ambiguous. Tom's Hardware calls it partially enclosed; The
  Gadgeteer says it is not enclosed. Since this field affects material safety
  warnings, a shipping row should either use the safer `none` classification or
  document why `passive` is acceptable.
- `max_bed_temp` conflicts: Voxelab's own manual says <=110 C; the retailer
  listing says max 100 C. Prefer the manufacturer value if shipping, but record
  the conflict and trigger review.
- Several required row fields still need source-backed decisions before a real
  commit: `max_acceleration`, `has_lidar`, `has_camera`,
  `multi_color_systems`, `available_plates`, and whether only `[0.4]` is valid
  for `available_nozzle_sizes`.

Draft taxonomy if the owner chooses to continue:

```json
{
  "id": "aries",
  "name": "Aries",
  "manufacturer": "voxelab",
  "series": "corexy",
  "series_group": "Aries"
}
```

This is **not** a shippable row. It is the starting point for an owner-approved
candidate packet.

Reviewer triggers fired:

- New `brands[]` row.
- New `series_group`.
- Conflicting source on key spec field.
- Non-obvious `series` mapping into a two-bucket engine model.

## Case 2: Anycubic Photon Mono M7 Pro Mislabeled As FDM

Recommendation: **decline**.

Classification: `declined-non-fdm`.

Reason:

- 3dpa is FDM/filament only.
- Anycubic's official product page and wiki position the Photon Mono M7 Pro as a
  resin printer, with high-speed resin, auto resin refill, resin heating, and a
  14K optical/LCD system.

Allowed assistant behavior:

- Stop before candidate creation.
- Log a decline.
- Do not add an Anycubic Photon row even though `anycubic` already exists in
  `brands[]`.

## Case 3: Nonexistent Model - Bambu Lab X9 Unicorn

Recommendation: **decline / no candidate**.

Classification: `unverified-model`.

Reason:

- No authoritative manufacturer source was found for "Bambu Lab X9 Unicorn".
- The safe claim is not "this cannot exist"; the safe claim is "there is not
  enough authoritative evidence to add it."

Allowed assistant behavior:

- Do not fabricate specs from adjacent Bambu models.
- Do not infer from user-provided wording.
- Ask for a manufacturer/product URL or suggest adding the user's actual FDM
  printer model instead.

## Case 4: Conflicting Source Field - Voxelab Aries Bed Temperature

Recommendation: **low-confidence field; candidate blocked until resolved**.

Conflict:

- Voxelab manual: hotbed temperature <=110 C.
- Retailer listing: heating bed max 100 C.

Resolution policy:

- Manufacturer source outranks retailer if we ship.
- The conflict still must be recorded because `max_bed_temp` affects warning and
  clamping behavior in generated profiles.
- Risk-triggered review is required.

## Data / Logic Impact Evaluation

No data or logic changed in this rehearsal.

If Aries proceeds later:

- Web impact: add a new brand, new picker section, and one printer row; run
  picker dry-run and a visual picker check.
- iOS-current-user impact: publish the additive overlay only after the bundled
  row exists and web verification is green. No TestFlight or iOS version bump.
- Engine/data-model impact: if the team is uncomfortable mapping Aries to
  `corexy`, adding a third `series` bucket would be an engine/app/validator/spec
  arc and must not be mixed into a printer-add commit.

## Hostile Review

Verdict: **GO for rehearsal quality; NO-GO for shipping Aries today**.

Strengths:

- The FDM-only gate is enforced.
- The resin adversarial case is correctly declined.
- The nonexistent-model case avoids fabrication.
- The real candidate is separated from the shipping decision.
- The iOS/TestFlight path is correctly excluded from printer delivery.

Important findings:

1. Aries cannot be considered ship-ready from the current evidence packet.
   Required catalog fields are still unresolved or insufficiently sourced.

2. The `series` mapping is a product/data-model decision. Forcing Aries into
   `corexy` may be pragmatic, but the report must not hide that this is an
   approximation under the current engine enum.

3. The enclosure classification is safety-relevant. A partial shell is not the
   same thing as a passive enclosed chamber in 3dpa warnings. Use the safer
   classification or document the rule.

4. The negative Bambu case must remain "unverified" rather than "proven fake."
   Lack of authoritative source blocks promotion; it is not universal proof.

5. The retailer conflict must not silently override the official manual. If a
   row is eventually shipped, prefer the manufacturer number and preserve the
   conflict in the commit/session evidence.

Assessment:

- Rehearsal passes the agent-contract test.
- Actual Aries add should start as a fresh candidate packet with explicit owner
  approval for the Voxelab brand and the chosen taxonomy.
